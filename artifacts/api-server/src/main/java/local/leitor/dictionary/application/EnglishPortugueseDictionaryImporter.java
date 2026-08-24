package local.leitor.dictionary.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.zip.GZIPInputStream;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Imports the Portuguese translations embedded in Kaikki's English Wiktionary
 * dump. It intentionally has its own source id, checkpoint and entry table.
 */
@Service
public class EnglishPortugueseDictionaryImporter {
    public static final String SOURCE_ID = "wiktextract-english-portuguese-br";
    public static final String SOURCE_NAME = "Kaikki / Wiktextract (Wiktionary) — traduções inglês–português";
    public static final String SOURCE_LICENSE = "CC BY-SA 4.0 (conteúdo do Wiktionary; consulte os avisos da edição)";
    public static final String SOURCE_ATTRIBUTION =
        "Traduções extraídas do Wiktionary por Wiktextract/Kaikki; https://kaikki.org/";
    public static final URI DEFAULT_DATASET_URL =
        URI.create("https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl.gz");
    public static final String DEFAULT_DATASET_VERSION = "kaikki-english-2026-08-20";

    private static final int BATCH_SIZE = 500;
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final TransactionTemplate transactions;
    private final HttpClient http = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1)
        .connectTimeout(Duration.ofSeconds(30)).build();

    public EnglishPortugueseDictionaryImporter(JdbcTemplate jdbc, ObjectMapper json,
                                                PlatformTransactionManager manager) {
        this.jdbc = jdbc;
        this.json = json;
        this.transactions = new TransactionTemplate(manager);
    }

    public ImportReport importDataset(URI url, String version) {
        if (version == null || version.isBlank()) throw new IllegalArgumentException("Informe a versão do dump.");
        String release = version.trim();
        String sourceUrl = url.toString();
        jdbc.update("""
            INSERT INTO public_dictionary_sources
              (id, name, version, source_url, license, attribution, entry_count)
            VALUES (?, ?, ?, ?, ?, ?, 0)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name, version=excluded.version,
              source_url=excluded.source_url, license=excluded.license, attribution=excluded.attribution
            """, SOURCE_ID, SOURCE_NAME, release, sourceUrl, SOURCE_LICENSE, SOURCE_ATTRIBUTION);

        Checkpoint checkpoint = checkpointFor(release, sourceUrl);
        long lastLine = checkpoint.lastLine();
        long skipped = checkpoint.skippedLines();
        long readThisRun = 0;
        updateCheckpoint(release, sourceUrl, lastLine, skipped, "RUNNING", null);
        List<Translation> batch = new ArrayList<>(BATCH_SIZE);
        try (InputStream input = open(url);
             BufferedReader reader = new BufferedReader(
                 new InputStreamReader(input, StandardCharsets.UTF_8), 1 << 20)) {
            String line;
            long lineNumber = 0;
            while ((line = reader.readLine()) != null) {
                lineNumber++;
                if (lineNumber <= lastLine) continue;
                readThisRun++;
                try {
                    batch.addAll(parse(line));
                } catch (RuntimeException exception) {
                    skipped++;
                }
                lastLine = lineNumber;
                if (batch.size() >= BATCH_SIZE) {
                    flush(batch, release);
                    batch.clear();
                    updateCheckpoint(release, sourceUrl, lastLine, skipped, "RUNNING", null);
                }
            }
            if (!batch.isEmpty()) flush(batch, release);
            updateCheckpoint(release, sourceUrl, lastLine, skipped, "COMPLETED", null);
            long count = currentEntryCount(release);
            jdbc.update("UPDATE public_dictionary_sources SET entry_count=? WHERE id=?", count, SOURCE_ID);
            return new ImportReport(SOURCE_ID, release, readThisRun, lastLine, count, skipped - checkpoint.skippedLines(), skipped);
        } catch (Exception exception) {
            updateCheckpoint(release, sourceUrl, lastLine, skipped, "ERROR", exception.getMessage());
            throw new IllegalStateException("A importação EN–PT-BR foi interrompida.", exception);
        }
    }

    protected InputStream open(URI url) throws Exception {
        HttpResponse<InputStream> response = http.send(HttpRequest.newBuilder(url)
            .timeout(Duration.ofMinutes(20)).header("Accept-Encoding", "gzip").GET().build(),
            HttpResponse.BodyHandlers.ofInputStream());
        if (response.statusCode() < 200 || response.statusCode() >= 300)
            throw new IllegalStateException("Download retornou HTTP " + response.statusCode());
        InputStream body = response.body();
        return url.getPath().endsWith(".gz") ? new GZIPInputStream(body, 1 << 20) : body;
    }

    private List<Translation> parse(String line) {
        if (line == null || line.isBlank()) return List.of();
        try {
            JsonNode root = json.readTree(line);
            String term = text(root, "word");
            if (term.isBlank() || !"en".equalsIgnoreCase(text(root, "lang_code"))) return List.of();
            String pos = text(root, "pos");
            List<Translation> result = new ArrayList<>();
            JsonNode translations = root.path("translations");
            if (!translations.isArray()) return result;
            translations.forEach(item -> {
                String language = text(item, "lang_code");
                String languageName = text(item, "lang");
                if (!("pt".equalsIgnoreCase(language) || "pt-br".equalsIgnoreCase(language)
                    || "Portuguese".equalsIgnoreCase(languageName))) return;
                String translated = text(item, "word").trim();
                if (!translated.isBlank()) {
                    String key = normalize(term) + "\u0000" + translated + "\u0000" + pos;
                    result.add(new Translation(stableId(key), term.trim(), translated, pos));
                }
            });
            return result;
        } catch (Exception exception) {
            throw new IllegalArgumentException("JSONL inválido", exception);
        }
    }

    private void flush(List<Translation> rows, String version) {
        // A dump can contain the same translation more than once. Deduplicate by
        // ID before batching because PostgreSQL rejects updating the same row
        // twice in one INSERT ... ON CONFLICT statement.
        Map<String, Translation> uniqueRows = new LinkedHashMap<>();
        rows.forEach(row -> uniqueRows.putIfAbsent(
            normalize(row.term()) + "\u0000" + row.translation() + "\u0000" + row.partOfSpeech(), row));
        List<Translation> deduplicated = new ArrayList<>(uniqueRows.values());
        transactions.executeWithoutResult(status -> {
            jdbc.batchUpdate("""
                INSERT INTO english_portuguese_dictionary_entries
                  (id, source_id, term, normalized_term, translation, part_of_speech, dataset_version)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (source_id, normalized_term, translation, part_of_speech)
                DO UPDATE SET term=excluded.term, dataset_version=excluded.dataset_version
                """, deduplicated, deduplicated.size(), (statement, row) -> {
                    statement.setString(1, row.id());
                    statement.setString(2, SOURCE_ID);
                    statement.setString(3, row.term());
                    statement.setString(4, normalize(row.term()));
                    statement.setString(5, row.translation());
                    statement.setString(6, row.partOfSpeech());
                    statement.setString(7, version);
                });
        });
    }

    public ImportStatus status() {
        List<Checkpoint> rows = jdbc.query("""
            SELECT dataset_version, source_url, last_line, skipped_lines, status, error_message, updated_at
            FROM public_dictionary_import_checkpoints WHERE source_id=?
            """, (rs, row) -> new Checkpoint(rs.getString(1), rs.getString(2), rs.getLong(3),
                rs.getLong(4), rs.getString(5), rs.getString(6), rs.getObject(7, OffsetDateTime.class)), SOURCE_ID);
        if (rows.isEmpty()) return new ImportStatus("NOT_STARTED", null, 0, 0, null, 0, null, null);
        Checkpoint c = rows.getFirst();
        return new ImportStatus(c.status(), c.datasetVersion(), c.lastLine(),
            currentEntryCount(c.datasetVersion()), c.lastLine(), c.skippedLines(), c.errorMessage(), c.updatedAt());
    }

    public void resetForReimport() {
        transactions.executeWithoutResult(status -> {
            jdbc.update("DELETE FROM english_portuguese_dictionary_entries WHERE source_id=?", SOURCE_ID);
            jdbc.update("DELETE FROM public_dictionary_import_checkpoints WHERE source_id=?", SOURCE_ID);
            jdbc.update("UPDATE public_dictionary_sources SET entry_count=0 WHERE id=?", SOURCE_ID);
        });
    }

    private Checkpoint checkpointFor(String version, String url) {
        List<Checkpoint> rows = jdbc.query("""
            SELECT dataset_version, source_url, last_line, skipped_lines, status, error_message, updated_at
            FROM public_dictionary_import_checkpoints WHERE source_id=?
            """, (rs, row) -> new Checkpoint(rs.getString(1), rs.getString(2), rs.getLong(3),
                rs.getLong(4), rs.getString(5), rs.getString(6), rs.getObject(7, OffsetDateTime.class)), SOURCE_ID);
        if (!rows.isEmpty() && version.equals(rows.getFirst().datasetVersion()) && url.equals(rows.getFirst().sourceUrl()))
            return rows.getFirst();
        jdbc.update("DELETE FROM public_dictionary_import_checkpoints WHERE source_id=?", SOURCE_ID);
        return new Checkpoint(version, url, 0, 0, "PAUSED", null, null);
    }

    private void updateCheckpoint(String version, String url, long line, long skipped, String state, String error) {
        jdbc.update("""
            INSERT INTO public_dictionary_import_checkpoints
              (source_id, dataset_version, source_url, last_line, skipped_lines, status, error_message, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            ON CONFLICT(source_id) DO UPDATE SET dataset_version=excluded.dataset_version,
              source_url=excluded.source_url, last_line=excluded.last_line, skipped_lines=excluded.skipped_lines,
              status=excluded.status, error_message=excluded.error_message, updated_at=NOW()
            """, SOURCE_ID, version, url, line, skipped, state, error);
    }

    private long currentEntryCount(String version) {
        Long count = jdbc.queryForObject("SELECT COUNT(*) FROM english_portuguese_dictionary_entries WHERE source_id=? AND dataset_version=?",
            Long.class, SOURCE_ID, version);
        return count == null ? 0 : count;
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isValueNode() ? value.asText("") : "";
    }
    private static String normalize(String value) {
        return value.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }
    private static String stableId(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder("en-pt-");
            for (int i = 0; i < 16; i++) result.append(String.format("%02x", digest[i]));
            return result.toString();
        } catch (Exception exception) {
            throw new IllegalStateException("Não foi possível criar o identificador da tradução.", exception);
        }
    }

    public record ImportReport(String sourceId, String version, long linesReadThisRun, long totalLinesRead,
                               long importedEntries, long skippedLinesThisRun, long skippedLinesTotal) {}
    public record ImportStatus(String status, String version, long linesProcessed, long importedEntries,
                               Long totalLines, long skippedLines, String errorMessage, OffsetDateTime checkpointUpdatedAt) {}
    private record Checkpoint(String datasetVersion, String sourceUrl, long lastLine, long skippedLines,
                              String status, String errorMessage, OffsetDateTime updatedAt) {}
    private record Translation(String id, String term, String translation, String partOfSpeech) {}
}