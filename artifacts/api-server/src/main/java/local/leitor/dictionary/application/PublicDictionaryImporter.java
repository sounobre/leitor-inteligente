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
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.zip.GZIPInputStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.stereotype.Service;

@Service
public class PublicDictionaryImporter {
    private static final Logger LOGGER = LoggerFactory.getLogger(PublicDictionaryImporter.class);
    private static final String SOURCE_ID = "wiktextract-english";
    private static final String SOURCE_NAME = "Kaikki / Wiktextract (Wiktionary)";
    private static final String SOURCE_LICENSE = "CC BY-SA 4.0 (Wiktionary content; verify notices for each release)";
    private static final String SOURCE_ATTRIBUTION = "Dados extraídos do Wiktionary por Wiktextract; https://kaikki.org/";
    private static final int BATCH_SIZE = 500;
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final TransactionTemplate transactions;
    private final HttpClient http = HttpClient.newBuilder()
        .version(HttpClient.Version.HTTP_1_1)
        .connectTimeout(Duration.ofSeconds(30))
        .build();

    public PublicDictionaryImporter(JdbcTemplate jdbc, ObjectMapper json,
                                    PlatformTransactionManager transactionManager) {
        this.jdbc = jdbc;
        this.json = json;
        this.transactions = new TransactionTemplate(transactionManager);
    }

    public ImportReport importDataset(URI datasetUrl, String version) {
        if (version == null || version.isBlank()) throw new IllegalArgumentException("Informe a versão do dump.");
        jdbc.update("""
            INSERT INTO public_dictionary_sources (id, name, version, source_url, license, attribution, entry_count)
            VALUES (?, ?, ?, ?, ?, ?, 0)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name, version=excluded.version,
              source_url=excluded.source_url, license=excluded.license, attribution=excluded.attribution
            """, SOURCE_ID, SOURCE_NAME, version.trim(), datasetUrl.toString(), SOURCE_LICENSE, SOURCE_ATTRIBUTION);
        String trimmedVersion = version.trim();
        Checkpoint checkpoint = checkpointFor(trimmedVersion, datasetUrl.toString());
        long resumeLine = checkpoint.lastLine();
        long linesReadThisRun = 0;
        long skipped = checkpoint.skippedLines();
        long lastObservedLine = resumeLine;
        updateCheckpoint(trimmedVersion, datasetUrl.toString(), resumeLine, skipped, checkpoint.totalLines(), "RUNNING", null);
        List<RecordData> batch = new ArrayList<>(BATCH_SIZE);
        try (InputStream input = open(datasetUrl);
             BufferedReader reader = new BufferedReader(new InputStreamReader(input, StandardCharsets.UTF_8), 1 << 20)) {
            String line;
            long lineNumber = 0;
            while ((line = reader.readLine()) != null) {
                lineNumber++;
                lastObservedLine = lineNumber;
                if (lineNumber <= resumeLine) continue;
                linesReadThisRun++;
                if (line.isBlank()) continue;
                try {
                    RecordData record = parse(line);
                    if (record == null) {
                        skipped++;
                    } else {
                        batch.add(record);
                        if (batch.size() >= BATCH_SIZE) {
                            flush(batch, trimmedVersion, datasetUrl.toString(), lineNumber, skipped);
                            batch.clear();
                            LOGGER.info("public dictionary import progress linesThisRun={} totalLines={} entries={}",
                                linesReadThisRun, lineNumber, currentEntryCount(trimmedVersion));
                        }
                    }
                } catch (Exception exception) {
                    skipped++;
                    if (skipped - checkpoint.skippedLines() <= 10) {
                        LOGGER.warn("Skipping invalid public dictionary line={} reason={}", lineNumber, exception.getMessage());
                    }
                }
            }
            if (!batch.isEmpty()) {
                flush(batch, trimmedVersion, datasetUrl.toString(), lineNumber, skipped);
            }
            updateCheckpoint(trimmedVersion, datasetUrl.toString(), lineNumber, skipped, lineNumber, "COMPLETED", null);
        } catch (Exception exception) {
            String message = exception.getMessage() == null ? "Falha desconhecida na importação." : exception.getMessage();
            updateCheckpoint(trimmedVersion, datasetUrl.toString(), lastObservedLine, skipped, checkpoint.totalLines(), "ERROR", message);
            throw new IllegalStateException("Não foi possível importar o dump do dicionário público.", exception);
        }
        jdbc.update("DELETE FROM public_dictionary_entries WHERE source_id = ? AND dataset_version <> ?", SOURCE_ID, trimmedVersion);
        long importedEntries = jdbc.queryForObject(
            "SELECT COUNT(*) FROM public_dictionary_entries WHERE source_id = ? AND dataset_version = ?",
            Long.class, SOURCE_ID, trimmedVersion);
        jdbc.update("UPDATE public_dictionary_sources SET entry_count = ? WHERE id = ?", importedEntries, SOURCE_ID);
        long totalLinesRead = checkpointFor(trimmedVersion, datasetUrl.toString()).lastLine();
        long skippedThisRun = Math.max(0, skipped - checkpoint.skippedLines());
        LOGGER.info("public dictionary import finished linesThisRun={} totalLines={} entries={} skippedThisRun={} skippedTotal={} version={}",
            linesReadThisRun, totalLinesRead, importedEntries, skippedThisRun, skipped, trimmedVersion);
        return new ImportReport(SOURCE_ID, trimmedVersion, linesReadThisRun, totalLinesRead,
            importedEntries, skippedThisRun, skipped);
    }

    public ImportStatus status() {
        List<Checkpoint> checkpoints = jdbc.query("""
            SELECT dataset_version, source_url, last_line, skipped_lines, total_lines, status, error_message
            FROM public_dictionary_import_checkpoints WHERE source_id = ?
            """, (rs, row) -> new Checkpoint(rs.getString("dataset_version"), rs.getString("source_url"),
            rs.getLong("last_line"), rs.getLong("skipped_lines"),
            (Long) rs.getObject("total_lines"), rs.getString("status"), rs.getString("error_message")), SOURCE_ID);
        if (checkpoints.isEmpty()) return new ImportStatus("IDLE", defaultDatasetVersion(), 0, 0, null, 0, null);
        Checkpoint checkpoint = checkpoints.getFirst();
        Long entries = jdbc.queryForObject(
            "SELECT COUNT(*) FROM public_dictionary_entries WHERE source_id = ? AND dataset_version = ?",
            Long.class, SOURCE_ID, checkpoint.datasetVersion());
        return new ImportStatus(checkpoint.status(), checkpoint.datasetVersion(), checkpoint.lastLine(),
            entries == null ? 0 : entries, checkpoint.totalLines(), checkpoint.skippedLines(), checkpoint.errorMessage());
    }

    public static URI defaultDatasetUrl() {
        return URI.create("https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl.gz");
    }

    public static String defaultDatasetVersion() {
        return "kaikki-english-2026-08-20";
    }

    private InputStream open(URI url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(url).timeout(Duration.ofMinutes(10)).GET().build();
        HttpResponse<InputStream> response = http.send(request, HttpResponse.BodyHandlers.ofInputStream());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            response.body().close();
            throw new IllegalStateException("Fonte respondeu HTTP " + response.statusCode());
        }
        InputStream body = response.body();
        return url.getPath().toLowerCase(Locale.ROOT).endsWith(".gz") ? new GZIPInputStream(body, 1 << 20) : body;
    }

    private RecordData parse(String line) throws Exception {
        JsonNode node = json.readTree(line);
        String languageCode = text(node, "lang_code");
        if (!"en".equalsIgnoreCase(languageCode)) return null;
        String term = text(node, "word").trim();
        String partOfSpeech = text(node, "pos").trim();
        if (term.isBlank()) return null;
        String entryId = stableId(normalize(term) + "\u0000" + partOfSpeech);
        List<String> senses = new ArrayList<>();
        JsonNode senseNodes = node.path("senses");
        if (senseNodes.isArray()) {
            for (JsonNode sense : senseNodes) {
                JsonNode glosses = sense.path("glosses");
                if (glosses.isArray()) {
                    for (JsonNode gloss : glosses) {
                        String definition = gloss.asText("").trim();
                        if (!definition.isBlank() && !senses.contains(definition)) senses.add(definition);
                    }
                }
            }
        }
        List<Form> forms = new ArrayList<>();
        JsonNode formNodes = node.path("forms");
        if (formNodes.isArray()) {
            for (JsonNode form : formNodes) {
                String value = text(form, "form").trim();
                if (!value.isBlank() && !value.equals(term)) forms.add(new Form(value, tags(form.path("tags"))));
            }
        }
        List<Sound> sounds = new ArrayList<>();
        JsonNode soundNodes = node.path("sounds");
        if (soundNodes.isArray()) {
            for (JsonNode sound : soundNodes) {
                String ipa = text(sound, "ipa").trim();
                String audio = text(sound, "mp3_url").trim();
                if (audio.isBlank()) audio = text(sound, "ogg_url").trim();
                if (!ipa.isBlank() || !audio.isBlank()) sounds.add(new Sound(ipa, audio));
            }
        }
        return new RecordData(entryId, term, partOfSpeech, senses, forms, sounds);
    }

    protected int flush(List<RecordData> records, String version, String sourceUrl, long lastLine, long skippedLines) {
        if (records.isEmpty()) return 0;
        return Objects.requireNonNull(transactions.execute(status ->
            flushInTransaction(records, version, sourceUrl, lastLine, skippedLines)));
    }

    private int flushInTransaction(List<RecordData> records, String version, String sourceUrl,
                                   long lastLine, long skippedLines) {
        Map<String, RecordData> uniqueRecords = new LinkedHashMap<>();
        records.forEach(record -> uniqueRecords.put(normalize(record.term()) + "\u0000" + record.partOfSpeech(), record));
        List<RecordData> deduplicated = new ArrayList<>(uniqueRecords.values());
        String placeholders = String.join(",", deduplicated.stream().map(record -> "?").toList());
        Object[] entryIds = deduplicated.stream().map(RecordData::id).toArray();
        jdbc.update("DELETE FROM public_dictionary_senses WHERE entry_id IN (" + placeholders + ")", entryIds);
        jdbc.update("DELETE FROM public_dictionary_forms WHERE entry_id IN (" + placeholders + ")", entryIds);
        jdbc.update("DELETE FROM public_dictionary_sounds WHERE entry_id IN (" + placeholders + ")", entryIds);

        List<Object[]> entries = new ArrayList<>(deduplicated.size());
        List<Object[]> senses = new ArrayList<>();
        List<Object[]> forms = new ArrayList<>();
        List<Object[]> sounds = new ArrayList<>();
        for (RecordData record : deduplicated) {
            entries.add(new Object[] {record.id(), SOURCE_ID, record.term(), normalize(record.term()), record.partOfSpeech(), version.trim()});
            int position = 1;
            for (String sense : record.senses()) {
                senses.add(new Object[] {stableId(record.id() + ":sense:" + position), record.id(), sense, position++});
            }
            int formIndex = 0;
            for (Form form : record.forms()) {
                forms.add(new Object[] {stableId(record.id() + ":form:" + formIndex++), record.id(), form.value(), form.tags()});
            }
            int soundIndex = 0;
            for (Sound sound : record.sounds()) {
                sounds.add(new Object[] {stableId(record.id() + ":sound:" + soundIndex++), record.id(), sound.ipa(), sound.audioUrl()});
            }
        }
        jdbc.batchUpdate("""
            INSERT INTO public_dictionary_entries (id, source_id, term, normalized_term, part_of_speech, dataset_version)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET term=excluded.term,
              normalized_term=excluded.normalized_term, part_of_speech=excluded.part_of_speech,
              dataset_version=excluded.dataset_version
            """, entries);
        jdbc.batchUpdate("INSERT INTO public_dictionary_senses (id, entry_id, definition, position) VALUES (?, ?, ?, ?)", senses);
        jdbc.batchUpdate("INSERT INTO public_dictionary_forms (id, entry_id, form, tags) VALUES (?, ?, ?, ?)", forms);
        jdbc.batchUpdate("INSERT INTO public_dictionary_sounds (id, entry_id, ipa, audio_url) VALUES (?, ?, ?, ?)", sounds);
        updateCheckpoint(version, sourceUrl, lastLine, skippedLines, null, "RUNNING", null);
        return deduplicated.size();
    }

    private Checkpoint checkpointFor(String version, String sourceUrl) {
        List<Checkpoint> checkpoints = jdbc.query("""
            SELECT dataset_version, source_url, last_line, skipped_lines, total_lines, status, error_message
            FROM public_dictionary_import_checkpoints WHERE source_id = ?
            """, (rs, row) -> new Checkpoint(rs.getString("dataset_version"), rs.getString("source_url"),
            rs.getLong("last_line"), rs.getLong("skipped_lines"), (Long) rs.getObject("total_lines"),
            rs.getString("status"), rs.getString("error_message")), SOURCE_ID);
        if (!checkpoints.isEmpty() && version.equals(checkpoints.getFirst().datasetVersion())
            && sourceUrl.equals(checkpoints.getFirst().sourceUrl())) return checkpoints.getFirst();
        jdbc.update("DELETE FROM public_dictionary_import_checkpoints WHERE source_id = ?", SOURCE_ID);
        return new Checkpoint(version, sourceUrl, 0, 0, null, "PAUSED", null);
    }

    private void updateCheckpoint(String version, String sourceUrl, long lastLine, long skippedLines,
                                  Long totalLines, String status, String errorMessage) {
        jdbc.update("""
            INSERT INTO public_dictionary_import_checkpoints
              (source_id, dataset_version, source_url, last_line, skipped_lines, total_lines, status, error_message, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ON CONFLICT(source_id) DO UPDATE SET dataset_version=excluded.dataset_version,
              source_url=excluded.source_url, last_line=excluded.last_line,
              skipped_lines=excluded.skipped_lines, total_lines=excluded.total_lines,
              status=excluded.status, error_message=excluded.error_message, updated_at=NOW()
            """, SOURCE_ID, version, sourceUrl, lastLine, skippedLines, totalLines, status, errorMessage);
    }

    private long currentEntryCount(String version) {
        Long count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM public_dictionary_entries WHERE source_id = ? AND dataset_version = ?",
            Long.class, SOURCE_ID, version);
        return count == null ? 0 : count;
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isValueNode() ? value.asText("") : "";
    }

    private static String tags(JsonNode node) {
        if (!node.isArray()) return "";
        List<String> values = new ArrayList<>();
        node.forEach(tag -> { if (!tag.asText("").isBlank()) values.add(tag.asText("")); });
        return String.join("|", values);
    }

    private static String normalize(String value) {
        return value.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }

    private static String stableId(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder("public-");
            for (int i = 0; i < 16; i++) result.append(String.format("%02x", digest[i]));
            return result.toString();
        } catch (Exception exception) {
            throw new IllegalStateException("Não foi possível criar o identificador do verbete.", exception);
        }
    }

    public record ImportReport(String sourceId, String version, long linesReadThisRun, long totalLinesRead,
                               long importedEntries, long skippedLinesThisRun, long skippedLinesTotal) {
        public long lines() {
            return linesReadThisRun;
        }
        public long skippedLines() {
            return skippedLinesThisRun;
        }
    }
    public record ImportStatus(String status, String version, long linesProcessed, long importedEntries,
                               Long totalLines, long skippedLines, String errorMessage) {}
    private record Checkpoint(String datasetVersion, String sourceUrl, long lastLine, long skippedLines,
                              Long totalLines, String status, String errorMessage) {}
    private record RecordData(String id, String term, String partOfSpeech, List<String> senses,
                              List<Form> forms, List<Sound> sounds) {}
    private record Form(String value, String tags) {}
    private record Sound(String ipa, String audioUrl) {}
}