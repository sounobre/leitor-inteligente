package local.leitor.dictionary.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import local.leitor.book.domain.model.Chapter;
import local.leitor.book.infra.extraction.EpubContentExtractor;
import local.leitor.shared.domain.BusinessValidationException;
import local.leitor.engine.domain.exception.StudyPlanGenerationException;

/**
 * Private, local-only dictionary workflow. Source files are parsed in memory and
 * never persisted, published, or passed to external AI providers.
 */
@Service
public class PrivateDictionaryService {
    private static final Pattern INLINE_ENTRY = Pattern.compile(
        "^\\s*([A-Za-z][A-Za-zÀ-ÿ'’ -]{1,90}?)\\s*(?:—|–|:|\\t)\\s*(.{3,420})\\s*$"
    );
    private static final Pattern COLON_ENTRY = Pattern.compile(
        "^\\s*([A-Za-z][A-Za-zÀ-ÿ'’ -]{1,90}?)\\s*:\\s*(.{3,420})\\s*$"
    );
    private static final Pattern SENSE_NUMBER = Pattern.compile("^\\s*(\\d+)[.)]?\\s*$");
    private static final Pattern EXPRESSION_START = Pattern.compile(
        "^(?:be|make|have|take|give|go|get|keep|let|put|come|fall|find|hold|lose|pay|play|run|see|set|show|stand|stick|throw|turn|break|bring|call|carry|catch|cut|do|draw|drive|drop|eat|face|feel|fill|follow|forget|hand|hit|join|leave|live|look|miss|move|pick|pull|reach|save|send|shake|sleep|speak|spend|start|stay|step|swim|talk|think|try|walk|watch|wear|win|wipe)\\b.*",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern TERM_ONLY = Pattern.compile("^[A-Za-z][A-Za-z'’ -]{1,90}$");
    private static final int MAX_ENTRIES_PER_IMPORT = 20_000;
    private final JdbcTemplate jdbc;
    private final EpubContentExtractor epubExtractor;
    private final ObjectMapper json;
    private final HttpClient http;

    public PrivateDictionaryService(
        JdbcTemplate jdbc,
        EpubContentExtractor epubExtractor,
        ObjectMapper json
    ) {
        this.jdbc = jdbc;
        this.epubExtractor = epubExtractor;
        this.json = json;
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();
    }

    @Transactional
    public ImportResult importEpub(ImportRequest request) {
        requirePrivateAcknowledgement(request.privateAcknowledged());
        if (request.fileName() == null || !request.fileName().toLowerCase(Locale.ROOT).endsWith(".epub")) {
            throw new BusinessValidationException("Escolha um arquivo EPUB para importar o dicionário.");
        }
        if (request.title() == null || request.title().isBlank()) {
            throw new BusinessValidationException("Dê um título para identificar esta fonte particular.");
        }

        List<Chapter> chapters = epubExtractor.extract(request.content(), request.fileName());
        String text = chapters.stream().map(Chapter::content).reduce("", (left, right) -> left + "\n" + right);
        ParseResult parsed = parseEntries(text);
        if (parsed.entries().isEmpty()) {
            throw new BusinessValidationException(
                "Não reconheci entradas suficientes neste EPUB. Este formato pode exigir ajustes no importador."
            );
        }

        String sourceId = UUID.randomUUID().toString();
        jdbc.update("""
            INSERT INTO dictionary_sources (id, title, publisher, isbn, source_type, is_private, entry_count)
            VALUES (?, ?, ?, ?, 'EPUB', TRUE, ?)
            """,
            sourceId,
            request.title().trim(),
            safe(request.publisher()),
            safe(request.isbn()),
            parsed.entries().size()
        );

        for (ParsedEntry parsedEntry : parsed.entries()) {
            String entryId = UUID.randomUUID().toString();
            jdbc.update("""
                INSERT INTO dictionary_entries (id, source_id, headword, term, normalized_term, translation, part_of_speech, usage_labels)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                entryId,
                sourceId,
                parsedEntry.headword(),
                parsedEntry.term(),
                normalize(parsedEntry.term()),
                parsedEntry.translation(),
                parsedEntry.partOfSpeech(),
                String.join("|", parsedEntry.usageLabels())
            );
            for (ParsedSense sense : parsedEntry.senses()) {
                jdbc.update("""
                    INSERT INTO dictionary_senses (id, entry_id, definition, translation, position)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    UUID.randomUUID().toString(),
                    entryId,
                    sense.definition(),
                    sense.translation(),
                    sense.position()
                );
            }
        }

        SourceSummary source = new SourceSummary(
            sourceId,
            request.title().trim(),
            safe(request.publisher()),
            safe(request.isbn()),
            parsed.entries().size(),
            Instant.now().toString()
        );
        return new ImportResult(source, parsed.entries().size(), parsed.skippedLines(), parsed.warnings());
    }

    @Transactional(readOnly = true)
    public List<EntrySummary> search(String rawQuery) {
        String query = safe(rawQuery).trim().toLowerCase(Locale.ROOT);
        String matcher = "%" + query + "%";
        return jdbc.query("""
            SELECT e.id, e.headword, e.term, e.translation, e.part_of_speech, e.usage_labels, s.title AS source_title,
              (SELECT COUNT(*) FROM dictionary_examples example WHERE example.entry_id = e.id) AS example_count
            FROM dictionary_entries e
            JOIN dictionary_sources s ON s.id = e.source_id
            WHERE ? = '' OR lower(e.term) LIKE ? OR lower(e.translation) LIKE ?
            ORDER BY CASE WHEN lower(e.term) = ? THEN 0 ELSE 1 END, e.term
            LIMIT 60
            """,
            (rs, rowNum) -> new EntrySummary(
                rs.getString("id"),
                rs.getString("headword"),
                rs.getString("term"),
                rs.getString("translation"),
                rs.getString("part_of_speech"),
                splitLabels(rs.getString("usage_labels")),
                rs.getString("source_title"),
                rs.getInt("example_count")
            ),
            query, matcher, matcher, query
        );
    }

    @Transactional(readOnly = true)
    public EntryDetail getEntry(String entryId) {
        EntryBase base = jdbc.query("""
            SELECT e.id, e.headword, e.term, e.translation, e.part_of_speech, e.usage_labels, s.title, s.publisher
            FROM dictionary_entries e JOIN dictionary_sources s ON s.id = e.source_id
            WHERE e.id = ?
            """,
            resultSet -> resultSet.next()
                ? new EntryBase(
                    resultSet.getString("id"),
                    resultSet.getString("headword"),
                    resultSet.getString("term"),
                    resultSet.getString("translation"),
                    resultSet.getString("part_of_speech"),
                    splitLabels(resultSet.getString("usage_labels")),
                    resultSet.getString("title"),
                    resultSet.getString("publisher")
                )
                : null,
            entryId
        );
        if (base == null) throw new BusinessValidationException("Esta entrada de dicionário não existe.");
        List<Sense> senses = jdbc.query("""
            SELECT id, definition, translation FROM dictionary_senses WHERE entry_id = ? ORDER BY position
            """,
            (rs, rowNum) -> new Sense(rs.getString("id"), rs.getString("definition"), rs.getString("translation")),
            entryId
        );
        List<GeneratedExample> examples = jdbc.query("""
            SELECT id, sentence, translation, explanation, created_at
            FROM dictionary_examples WHERE entry_id = ? ORDER BY created_at DESC
            """,
            (rs, rowNum) -> new GeneratedExample(
                rs.getString("id"),
                rs.getString("sentence"),
                rs.getString("translation"),
                rs.getString("explanation"),
                rs.getTimestamp("created_at").toInstant().toString()
            ),
            entryId
        );
        List<StudyCard> cards = jdbc.query("""
            SELECT card.id, entry.term, entry.translation, card.example_id
            FROM dictionary_study_cards card JOIN dictionary_entries entry ON entry.id = card.entry_id
            WHERE card.entry_id = ? ORDER BY card.created_at DESC
            """,
            (rs, rowNum) -> new StudyCard(
                rs.getString("id"),
                rs.getString("term"),
                rs.getString("translation"),
                rs.getString("example_id")
            ),
            entryId
        );
        return new EntryDetail(
            base.id(), base.headword(), base.term(), base.translation(), base.partOfSpeech(), base.usageLabels(),
            new SourceInfo(base.sourceTitle(), base.publisher()), senses, examples, cards
        );
    }

    @Transactional
    public GeneratedExample generateExample(String entryId, ExampleRequest request) {
        if (!"ollama".equalsIgnoreCase(safe(request.provider()))) {
            throw new BusinessValidationException(
                "Fontes particulares usam somente Ollama local. O conteúdo não será enviado ao OpenRouter."
            );
        }
        if (safe(request.endpoint()).isBlank() || safe(request.model()).isBlank()) {
            throw new BusinessValidationException("Informe o endpoint e o modelo local do Ollama.");
        }
        URI ollamaEndpoint = localOllamaEndpoint(request.endpoint());
        EntryDetail entry = getEntry(entryId);
        String prompt = """
            Create one original neutral English example for a private language-study card.
            The source is a privately owned dictionary: do not quote or reproduce a dictionary example.
            Use the exact term or expression naturally in the sentence. Do not use proper names or book references.
            Return only valid JSON with sentence, translation and explanation.
            Translation and explanation must be Brazilian Portuguese. Sentence maximum: 18 words.
            Term: %s
            Translation hint: %s
            Part of speech: %s
            """.formatted(entry.term(), entry.translation(), entry.partOfSpeech());
        Map<String, Object> body = Map.of(
            "model", request.model().trim(),
            "stream", false,
            "format", "json",
            "prompt", prompt
        );
        try {
            HttpRequest ollamaRequest = HttpRequest.newBuilder()
                .uri(URI.create(ollamaEndpoint.toString().replaceAll("/+$", "") + "/api/generate"))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(120))
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)))
                .build();
            HttpResponse<String> response = http.send(ollamaRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new StudyPlanGenerationException("Ollama retornou HTTP " + response.statusCode());
            }
            JsonNode root = json.readTree(json.readTree(response.body()).path("response").asText());
            String sentence = root.path("sentence").asText("").trim();
            String translation = root.path("translation").asText("").trim();
            String explanation = root.path("explanation").asText("").trim();
            validateGeneratedExample(entry.term(), sentence, translation, explanation);
            String exampleId = UUID.randomUUID().toString();
            jdbc.update("""
                INSERT INTO dictionary_examples (id, entry_id, sentence, translation, explanation, provider, model)
                VALUES (?, ?, ?, ?, ?, 'ollama', ?)
                """,
                exampleId, entryId, sentence, translation, explanation, request.model().trim()
            );
            return new GeneratedExample(exampleId, sentence, translation, explanation, Instant.now().toString());
        } catch (BusinessValidationException | StudyPlanGenerationException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new StudyPlanGenerationException("Não foi possível gerar um exemplo local com o Ollama.", exception);
        }
    }

    @Transactional
    public StudyCard createStudyCard(String entryId, CardRequest request) {
        getEntry(entryId);
        String exampleId = request == null ? null : safe(request.exampleId()).trim();
        if (exampleId != null && !exampleId.isBlank()) {
            Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM dictionary_examples WHERE id = ? AND entry_id = ?",
                Integer.class,
                exampleId,
                entryId
            );
            if (count == null || count == 0) {
                throw new BusinessValidationException("O exemplo escolhido não pertence a esta entrada.");
            }
        } else {
            exampleId = null;
        }
        String cardId = UUID.randomUUID().toString();
        jdbc.update(
            "INSERT INTO dictionary_study_cards (id, entry_id, example_id) VALUES (?, ?, ?)",
            cardId, entryId, exampleId
        );
        EntryDetail entry = getEntry(entryId);
        return new StudyCard(cardId, entry.term(), entry.translation(), exampleId);
    }

    static ParseResult parseEntries(String content) {
        LinkedHashMap<String, ParsedEntry> parsed = new LinkedHashMap<>();
        String[] lines = content.replace('\r', '\n').split("\n");
        int skipped = 0;
        for (int index = 0; index < lines.length && parsed.size() < MAX_ENTRIES_PER_IMPORT; index++) {
            String line = lines[index].trim().replaceAll("\\s+", " ");
            if (line.isBlank()) continue;
            Matcher colonEntry = COLON_ENTRY.matcher(line);
            if (colonEntry.matches()) {
                if (!looksLikeDictionaryHeadword(colonEntry.group(1))) {
                    skipped++;
                    continue;
                }
                ParsedBlock block = parseColonBlock(lines, index, colonEntry.group(1), colonEntry.group(2));
                addParsed(parsed, block);
                index = block.endIndex();
                continue;
            }
            Matcher inline = INLINE_ENTRY.matcher(line);
            if (inline.matches()) {
                addParsed(parsed, inline.group(1), inline.group(2));
                continue;
            }
            if (TERM_ONLY.matcher(line).matches() && index + 1 < lines.length) {
                String next = lines[index + 1].trim().replaceAll("\\s+", " ");
                if (next.length() >= 3 && next.length() <= 420
                    && !TERM_ONLY.matcher(next).matches()
                    && !COLON_ENTRY.matcher(next).matches()) {
                    addParsed(parsed, line, next);
                    index++;
                    continue;
                }
            }
            skipped++;
        }
        List<String> warnings = new ArrayList<>();
        if (skipped > 0) warnings.add("Algumas linhas não seguiram um formato de entrada reconhecível e foram ignoradas.");
        if (parsed.size() >= MAX_ENTRIES_PER_IMPORT) warnings.add("A importação foi limitada a 20.000 entradas nesta versão.");
        return new ParseResult(new ArrayList<>(parsed.values()), skipped, warnings);
    }

    private static void addParsed(Map<String, ParsedEntry> entries, String rawTerm, String rawDefinition) {
        addParsed(entries, new ParsedBlock(
            new ParsedEntry(
                promoteHeadwordToExpression(rawTerm, rawDefinition),
                "",
                List.of(new ParsedSense(rawDefinition.trim(), shortenTranslation(rawDefinition), 1)),
                List.of(),
                detectPartOfSpeech(rawDefinition)
            ),
            -1
        ));
    }

    private static void addParsed(Map<String, ParsedEntry> entries, ParsedBlock block) {
        ParsedEntry entry = block.entry();
        if (entry.term().length() < 2 || entry.senses().isEmpty()) return;
        entries.putIfAbsent(normalize(entry.term()), entry);
    }

    private static ParsedBlock parseColonBlock(String[] lines, int startIndex, String rawHeadword, String rawDefinition) {
        String term = promoteHeadwordToExpression(rawHeadword, rawDefinition);
        List<ParsedSense> senses = new ArrayList<>();
        Set<String> usageLabels = new HashSet<>();
        int position = 1;
        int index = startIndex + 1;
        while (index < lines.length) {
            String line = cleanLine(lines[index]);
            if (line.isBlank()) {
                index++;
                continue;
            }
            if (index > startIndex && COLON_ENTRY.matcher(line).matches()) break;
            String usage = usageLabel(line);
            if (usage != null) {
                usageLabels.add(usage);
                index++;
                continue;
            }
            if (SENSE_NUMBER.matcher(line).matches()) {
                position = Integer.parseInt(SENSE_NUMBER.matcher(line).replaceFirst("$1"));
                index++;
                continue;
            }
            if (looksLikeExample(line)) {
                index++;
                continue;
            }
            int next = nextNonBlankLine(lines, index + 1);
            if (next >= 0 && looksLikeExampleStart(cleanLine(lines[next]))) {
                index = skipExample(lines, index);
                continue;
            }
            if (line.length() >= 3 && line.length() <= 420) {
                senses.add(new ParsedSense(rawDefinition.trim(), line, position++));
            }
            index++;
        }
        if (senses.isEmpty()) {
            senses.add(new ParsedSense(rawDefinition.trim(), shortenTranslation(rawDefinition), 1));
        }
        return new ParsedBlock(
            new ParsedEntry(term, rawHeadword.trim(), senses, usageLabels.stream().sorted().toList(), detectPartOfSpeech(rawDefinition)),
            index - 1
        );
    }

    private static String promoteHeadwordToExpression(String rawTerm, String rawDefinition) {
        String headword = rawTerm.trim();
        String expression = rawDefinition.trim().replaceAll("\\s+", " ");
        if (!headword.contains(" ") && EXPRESSION_START.matcher(expression).matches()) {
            return expression.replaceAll("\\s*\\([^)]*\\)", "").replaceAll("\\s+", " ").trim();
        }
        return headword;
    }

    private static int nextNonBlankLine(String[] lines, int start) {
        for (int index = start; index < lines.length; index++) {
            if (!lines[index].trim().isBlank()) return index;
        }
        return -1;
    }

    private static boolean looksLikeExample(String line) {
        return line.contains(" / ") || line.endsWith("/") || line.startsWith("/");
    }

    private static boolean looksLikeExampleStart(String line) {
        return line.startsWith("/");
    }

    private static int skipExample(String[] lines, int start) {
        int index = nextNonBlankLine(lines, start + 1);
        if (index < 0) return lines.length;
        int afterExample = nextNonBlankLine(lines, index + 1);
        return afterExample < 0 ? lines.length : afterExample;
    }

    private static String cleanLine(String line) {
        return line.trim().replaceAll("\\s+", " ");
    }

    private static String usageLabel(String line) {
        return switch (line.toLowerCase(Locale.ROOT)) {
            case "amer" -> "Amer";
            case "brit" -> "Brit";
            case "dit" -> "dit";
            case "form" -> "form";
            case "inf" -> "inf";
            case "pop" -> "pop";
            case "comp" -> "comp";
            case "vulg" -> "vulg";
            default -> null;
        };
    }

    private static boolean looksLikeDictionaryHeadword(String headword) {
        return headword.trim().matches("[A-Za-z][A-Za-z'’\\-]*(?:\\s+[A-Za-z][A-Za-z'’\\-]*)?");
    }

    private static List<String> splitLabels(String labels) {
        if (labels == null || labels.isBlank()) return List.of();
        return Arrays.stream(labels.split("\\|")).filter(label -> !label.isBlank()).toList();
    }

    private static String shortenTranslation(String definition) {
        String result = definition.replaceAll("^(?:\\([^)]{1,20}\\)\\s*)+", "").trim();
        return result.length() > 160 ? result.substring(0, 157).trim() + "…" : result;
    }

    private static String detectPartOfSpeech(String definition) {
        String normalized = definition.toLowerCase(Locale.ROOT);
        if (normalized.startsWith("v.") || normalized.startsWith("verbo")) return "verbo";
        if (normalized.startsWith("adj.") || normalized.startsWith("adjetivo")) return "adjetivo";
        if (normalized.startsWith("s.") || normalized.startsWith("substantivo")) return "substantivo";
        return "expressão";
    }

    private static void validateGeneratedExample(String term, String sentence, String translation, String explanation) {
        if (sentence.isBlank() || translation.isBlank() || explanation.isBlank()) {
            throw new StudyPlanGenerationException("O Ollama não retornou todos os campos do exemplo.");
        }
        if (sentence.length() > 220 || translation.length() > 280 || explanation.length() > 320) {
            throw new StudyPlanGenerationException("O exemplo gerado ficou longo demais para um cartão.");
        }
        String normalizedTerm = normalize(term);
        String normalizedSentence = normalize(sentence);
        if (!normalizedSentence.contains(normalizedTerm)) {
            throw new StudyPlanGenerationException("O exemplo gerado não usa o termo solicitado.");
        }
    }

    private static void requirePrivateAcknowledgement(Boolean acknowledged) {
        if (!Boolean.TRUE.equals(acknowledged)) {
            throw new BusinessValidationException("Confirme que esta fonte é particular e não será compartilhada.");
        }
    }

    private static URI localOllamaEndpoint(String rawEndpoint) {
        try {
            URI endpoint = URI.create(rawEndpoint.trim());
            String host = endpoint.getHost() == null ? "" : endpoint.getHost().toLowerCase(Locale.ROOT);
            if (!("http".equalsIgnoreCase(endpoint.getScheme()) || "https".equalsIgnoreCase(endpoint.getScheme()))
                || !("localhost".equals(host) || "127.0.0.1".equals(host) || "::1".equals(host))) {
                throw new BusinessValidationException(
                    "Para proteger a fonte particular, use apenas um endpoint local do Ollama (localhost)."
                );
            }
            return endpoint;
        } catch (IllegalArgumentException exception) {
            throw new BusinessValidationException("O endpoint local do Ollama não é válido.");
        }
    }

    private static String normalize(String value) {
        return safe(value).toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }

    private static String safe(String value) {
        return value == null ? "" : value;
    }

    public record ImportRequest(
        String title, String publisher, String isbn, String fileName, String content, Boolean privateAcknowledged
    ) {}
    public record ExampleRequest(String provider, String endpoint, String model) {}
    public record CardRequest(String exampleId) {}
    public record SourceSummary(String id, String title, String publisher, String isbn, int entryCount, String createdAt) {}
    public record ImportResult(SourceSummary source, int importedEntries, int skippedLines, List<String> warnings) {}
    public record EntrySummary(
        String id, String headword, String term, String translation, String partOfSpeech, List<String> usageLabels,
        String sourceTitle, int exampleCount
    ) {}
    public record SourceInfo(String title, String publisher) {}
    public record Sense(String id, String definition, String translation) {}
    public record GeneratedExample(String id, String sentence, String translation, String explanation, String createdAt) {}
    public record StudyCard(String id, String term, String translation, String exampleId) {}
    public record EntryDetail(
        String id, String headword, String term, String translation, String partOfSpeech, List<String> usageLabels, SourceInfo source,
        List<Sense> senses, List<GeneratedExample> examples, List<StudyCard> cards
    ) {}
    record ParsedEntry(String term, String headword, List<ParsedSense> senses, List<String> usageLabels, String partOfSpeech) {
        String definition() { return senses.getFirst().definition(); }
        String translation() { return senses.getFirst().translation(); }
    }
    record ParsedSense(String definition, String translation, int position) {}
    record ParsedBlock(ParsedEntry entry, int endIndex) {}
    record ParseResult(List<ParsedEntry> entries, int skippedLines, List<String> warnings) {}
    private record EntryBase(
        String id, String headword, String term, String translation, String partOfSpeech, List<String> usageLabels,
        String sourceTitle, String publisher
    ) {}
}