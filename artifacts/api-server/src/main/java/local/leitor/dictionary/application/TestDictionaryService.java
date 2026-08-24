package local.leitor.dictionary.application;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import local.leitor.shared.domain.BusinessValidationException;

@Service
public class TestDictionaryService {
    private final JdbcTemplate jdbc;

    public TestDictionaryService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public List<EntrySummary> search(String rawQuery) {
        String query = rawQuery == null ? "" : rawQuery.trim().toLowerCase(Locale.ROOT);
        String matcher = "%" + query + "%";
        return jdbc.query("""
            SELECT e.id, e.term, e.translation, e.part_of_speech,
              (SELECT COUNT(*) FROM dictionary_test_examples x WHERE x.entry_id = e.id) AS example_count
            FROM dictionary_test_entries e
            WHERE ? = '' OR lower(e.term) LIKE ? OR lower(e.translation) LIKE ?
            ORDER BY CASE WHEN lower(e.term) = ? THEN 0 ELSE 1 END, e.term
            LIMIT 300
            """,
            (rs, row) -> new EntrySummary(rs.getString("id"), rs.getString("term"),
                rs.getString("translation"), rs.getString("part_of_speech"), rs.getInt("example_count")),
            query, matcher, matcher, query);
    }

    @Transactional(readOnly = true)
    public List<EntryDetail> sync() {
        return search("").stream().map(entry -> getEntry(entry.id())).toList();
    }

    @Transactional(readOnly = true)
    public EntryDetail getEntry(String entryId) {
        EntryBase base = jdbc.query("""
            SELECT id, term, translation, part_of_speech
            FROM dictionary_test_entries WHERE id = ?
            """,
            rs -> rs.next() ? new EntryBase(rs.getString("id"), rs.getString("term"),
                rs.getString("translation"), rs.getString("part_of_speech")) : null, entryId);
        if (base == null) throw new BusinessValidationException("Esta palavra de teste não existe.");
        List<Sense> senses = jdbc.query("""
            SELECT id, definition, translation FROM dictionary_test_senses
            WHERE entry_id = ? ORDER BY position
            """, (rs, row) -> new Sense(rs.getString("id"), rs.getString("definition"), rs.getString("translation")), entryId);
        List<GeneratedExample> examples = jdbc.query("""
            SELECT id, sentence, translation, explanation, created_at
            FROM dictionary_test_examples WHERE entry_id = ? ORDER BY created_at DESC
            """, (rs, row) -> new GeneratedExample(rs.getString("id"), rs.getString("sentence"),
                rs.getString("translation"), rs.getString("explanation"), rs.getTimestamp("created_at").toInstant().toString()), entryId);
        List<StudyCard> cards = jdbc.query("""
            SELECT card.id, card.entry_id, card.example_id, entry.term, entry.translation
            FROM dictionary_test_study_cards card
            JOIN dictionary_test_entries entry ON entry.id = card.entry_id
            WHERE card.entry_id = ? ORDER BY card.created_at DESC
            """, (rs, row) -> new StudyCard(rs.getString("id"), rs.getString("entry_id"), rs.getString("example_id"),
                rs.getString("term"), rs.getString("translation")), entryId);
        return new EntryDetail(base.id(), base.term(), base.translation(), base.partOfSpeech(), senses, examples, cards);
    }

    @Transactional
    public GeneratedExample saveExample(String entryId, ExampleRequest request) {
        EntryDetail entry = getEntry(entryId);
        String sentence = safe(request.sentence()).trim();
        String translation = safe(request.translation()).trim();
        String explanation = safe(request.explanation()).trim();
        if (sentence.isBlank() || translation.isBlank() || explanation.isBlank()) {
            throw new BusinessValidationException("Preencha frase, tradução e explicação para salvar o exemplo.");
        }
        if (!normalize(sentence).contains(normalize(entry.term()))) {
            throw new BusinessValidationException("O exemplo precisa usar a palavra selecionada.");
        }
        String id = UUID.randomUUID().toString();
        jdbc.update("""
            INSERT INTO dictionary_test_examples (id, entry_id, sentence, translation, explanation, provider, model)
            VALUES (?, ?, ?, ?, ?, 'ollama', ?)
            """, id, entryId, sentence, translation, explanation, safe(request.model()).trim());
        return new GeneratedExample(id, sentence, translation, explanation, Instant.now().toString());
    }

    @Transactional
    public StudyCard createCard(String entryId, String exampleId) {
        getEntry(entryId);
        if (exampleId != null && !exampleId.isBlank()) {
            Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM dictionary_test_examples WHERE id = ? AND entry_id = ?",
                Integer.class, exampleId, entryId);
            if (count == null || count == 0) throw new BusinessValidationException("O exemplo não pertence a esta palavra.");
        }
        String id = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO dictionary_test_study_cards (id, entry_id, example_id) VALUES (?, ?, ?)",
            id, entryId, exampleId);
        EntryDetail entry = getEntry(entryId);
        return new StudyCard(id, entryId, exampleId, entry.term(), entry.translation());
    }

    private static String safe(String value) { return value == null ? "" : value; }
    private static String normalize(String value) { return safe(value).toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim(); }

    public record EntrySummary(String id, String term, String translation, String partOfSpeech, int exampleCount) {}
    public record Sense(String id, String definition, String translation) {}
    public record GeneratedExample(String id, String sentence, String translation, String explanation, String createdAt) {}
    public record StudyCard(String id, String entryId, String exampleId, String term, String translation) {}
    public record EntryDetail(String id, String term, String translation, String partOfSpeech,
                              List<Sense> senses, List<GeneratedExample> examples, List<StudyCard> cards) {}
    public record ExampleRequest(String sentence, String translation, String explanation, String model) {}
    private record EntryBase(String id, String term, String translation, String partOfSpeech) {}
}