package local.leitor.dictionary.application;

import java.util.List;
import java.util.Locale;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import local.leitor.shared.domain.BusinessValidationException;

@Service
public class PublicDictionaryService {
    private final JdbcTemplate jdbc;

    public PublicDictionaryService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public List<EntrySummary> search(String rawQuery, int limit) {
        String query = rawQuery == null ? "" : rawQuery.trim().toLowerCase(Locale.ROOT);
        int safeLimit = Math.max(1, Math.min(limit, 100));
        String matcher = query + "%";
        return jdbc.query("""
            SELECT e.id, e.term, e.part_of_speech,
              (SELECT COUNT(*) FROM public_dictionary_senses s WHERE s.entry_id = e.id) AS sense_count
            FROM public_dictionary_entries e
            WHERE ? = '' OR lower(e.term) LIKE ? OR lower(e.term) = ?
            ORDER BY CASE WHEN lower(e.term) = ? THEN 0 WHEN lower(e.term) LIKE ? THEN 1 ELSE 2 END, e.term, e.part_of_speech
            LIMIT ?
            """,
            (rs, row) -> new EntrySummary(rs.getString("id"), rs.getString("term"),
                rs.getString("part_of_speech"), rs.getInt("sense_count")),
            query, matcher, query, query, matcher, safeLimit);
    }

    @Transactional(readOnly = true)
    public EntryDetail getEntry(String entryId) {
        EntryBase base = jdbc.query("""
            SELECT e.id, e.term, e.part_of_speech, s.name, s.version, s.license, s.attribution
            FROM public_dictionary_entries e
            JOIN public_dictionary_sources s ON s.id = e.source_id
            WHERE e.id = ?
            """,
            rs -> rs.next() ? new EntryBase(rs.getString("id"), rs.getString("term"),
                rs.getString("part_of_speech"), "", rs.getString("name"), rs.getString("version"),
                rs.getString("license"), rs.getString("attribution")) : null, entryId);
        if (base == null) throw new BusinessValidationException("Este verbete público não existe.");
        List<Sense> senses = jdbc.query("""
            SELECT id, definition, position FROM public_dictionary_senses
            WHERE entry_id = ? ORDER BY position
            """, (rs, row) -> new Sense(rs.getString("id"), rs.getString("definition"), rs.getInt("position")), entryId);
        List<Form> forms = jdbc.query("""
            SELECT id, form, tags FROM public_dictionary_forms
            WHERE entry_id = ? ORDER BY form
            """, (rs, row) -> new Form(rs.getString("id"), rs.getString("form"), rs.getString("tags")), entryId);
        List<Sound> sounds = jdbc.query("""
            SELECT id, ipa, audio_url FROM public_dictionary_sounds
            WHERE entry_id = ? ORDER BY ipa
            """, (rs, row) -> new Sound(rs.getString("id"), rs.getString("ipa"), rs.getString("audio_url")), entryId);
        return new EntryDetail(base.id(), base.term(), base.partOfSpeech(), senses, forms, sounds,
            new SourceInfo(base.sourceName(), base.version(), base.license(), base.attribution()));
    }

    @Transactional(readOnly = true)
    public List<EntrySummary> searchEnglishPortuguese(String rawQuery, int limit) {
        String query = rawQuery == null ? "" : rawQuery.trim().toLowerCase(Locale.ROOT);
        int safeLimit = Math.max(1, Math.min(limit, 100));
        String matcher = query + "%";
        return jdbc.query("""
            SELECT e.id, e.term, e.part_of_speech, 1 AS sense_count
            FROM english_portuguese_dictionary_entries e
            WHERE ? = '' OR lower(e.term) LIKE ? OR lower(e.term) = ?
            ORDER BY CASE WHEN lower(e.term) = ? THEN 0 WHEN lower(e.term) LIKE ? THEN 1 ELSE 2 END,
              e.term, e.translation, e.part_of_speech
            LIMIT ?
            """, (rs, row) -> new EntrySummary(rs.getString("id"), rs.getString("term"),
                rs.getString("part_of_speech"), rs.getInt("sense_count")),
            query, matcher, query, query, matcher, safeLimit);
    }

    @Transactional(readOnly = true)
    public EntryDetail getEnglishPortugueseEntry(String entryId) {
        EntryBase base = jdbc.query("""
            SELECT e.id, e.term, e.part_of_speech, e.translation,
              s.name, s.version, s.license, s.attribution
            FROM english_portuguese_dictionary_entries e
            JOIN public_dictionary_sources s ON s.id = e.source_id
            WHERE e.id = ?
            """, rs -> rs.next() ? new EntryBase(rs.getString("id"), rs.getString("term"),
                rs.getString("part_of_speech"), s(rs.getString("translation")),
                rs.getString("name"), rs.getString("version"), rs.getString("license"),
                rs.getString("attribution")) : null, entryId);
        if (base == null) throw new BusinessValidationException("Esta tradução pública não existe.");
        return new EntryDetail(base.id(), base.term(), base.partOfSpeech(),
            List.of(new Sense(base.id() + "-translation", base.translation(), 1)),
            List.of(), List.of(), new SourceInfo(base.sourceName(), base.version(),
                base.license(), base.attribution()));
    }

    private static String s(String value) {
        return value == null ? "" : value;
    }

    public record EntrySummary(String id, String term, String partOfSpeech, int senseCount) {}
    public record Sense(String id, String definition, int position) {}
    public record Form(String id, String form, String tags) {}
    public record Sound(String id, String ipa, String audioUrl) {}
    public record SourceInfo(String name, String version, String license, String attribution) {}
    public record EntryDetail(String id, String term, String partOfSpeech, List<Sense> senses,
                              List<Form> forms, List<Sound> sounds, SourceInfo source) {}
    private record EntryBase(String id, String term, String partOfSpeech, String translation, String sourceName,
                             String version, String license, String attribution) {}
}