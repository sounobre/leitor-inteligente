package local.leitor.shared.infra.persistence;

import jakarta.annotation.PostConstruct;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseInitializer {
  private final JdbcTemplate jdbc;

  public DatabaseInitializer(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @PostConstruct
  void ensureSchema() {
    jdbc.execute("""
        CREATE TABLE IF NOT EXISTS books (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          author TEXT NOT NULL,
          source_type TEXT NOT NULL,
          status TEXT NOT NULL,
          level TEXT NOT NULL,
          progress INTEGER NOT NULL DEFAULT 0,
          cover_color TEXT NOT NULL,
          content TEXT NOT NULL DEFAULT '',
          plan JSONB NOT NULL DEFAULT '{"vocabulary":[],"idioms":[],"phrasalVerbs":[]}',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """);
    jdbc.execute("ALTER TABLE books ADD COLUMN IF NOT EXISTS reading_chapter INTEGER NOT NULL DEFAULT 1");
    jdbc.execute("ALTER TABLE books ADD COLUMN IF NOT EXISTS reading_offset INTEGER NOT NULL DEFAULT 0");
    jdbc.execute("ALTER TABLE books ADD COLUMN IF NOT EXISTS reading_position_updated_at TIMESTAMPTZ");
    jdbc.execute("""
        CREATE TABLE IF NOT EXISTS book_chapters (
          id TEXT PRIMARY KEY,
          book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
          position INTEGER NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          word_count INTEGER NOT NULL DEFAULT 0,
          UNIQUE(book_id, position)
        )
        """);
    jdbc.execute("""
        CREATE TABLE IF NOT EXISTS book_vocabulary (
          id BIGSERIAL PRIMARY KEY,
          book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
          term TEXT NOT NULL,
          normalized_term TEXT NOT NULL,
          occurrences INTEGER NOT NULL DEFAULT 1,
          chapters JSONB NOT NULL DEFAULT '[]',
          card_created BOOLEAN NOT NULL DEFAULT FALSE,
          UNIQUE(book_id, normalized_term)
        )
        """);
    jdbc.execute("CREATE INDEX IF NOT EXISTS idx_book_vocabulary_term ON book_vocabulary(book_id, normalized_term)");
    jdbc.execute("""
        CREATE TABLE IF NOT EXISTS dictionary_sources (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          publisher TEXT NOT NULL DEFAULT '',
          isbn TEXT NOT NULL DEFAULT '',
          source_type TEXT NOT NULL DEFAULT 'EPUB',
          is_private BOOLEAN NOT NULL DEFAULT TRUE,
          entry_count INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """);
    jdbc.execute("""
        CREATE TABLE IF NOT EXISTS dictionary_entries (
          id TEXT PRIMARY KEY,
          source_id TEXT NOT NULL REFERENCES dictionary_sources(id) ON DELETE CASCADE,
          headword TEXT NOT NULL DEFAULT '',
          term TEXT NOT NULL,
          normalized_term TEXT NOT NULL,
          translation TEXT NOT NULL,
          part_of_speech TEXT NOT NULL DEFAULT 'expressão',
          usage_labels TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(source_id, normalized_term)
        )
        """);
    jdbc.execute("ALTER TABLE dictionary_entries ADD COLUMN IF NOT EXISTS headword TEXT NOT NULL DEFAULT ''");
    jdbc.execute("ALTER TABLE dictionary_entries ADD COLUMN IF NOT EXISTS usage_labels TEXT NOT NULL DEFAULT ''");
    jdbc.execute("""
        CREATE TABLE IF NOT EXISTS dictionary_senses (
          id TEXT PRIMARY KEY,
          entry_id TEXT NOT NULL REFERENCES dictionary_entries(id) ON DELETE CASCADE,
          definition TEXT NOT NULL,
          translation TEXT NOT NULL DEFAULT '',
          position INTEGER NOT NULL DEFAULT 1
        )
        """);
    jdbc.execute("""
        CREATE TABLE IF NOT EXISTS dictionary_examples (
          id TEXT PRIMARY KEY,
          entry_id TEXT NOT NULL REFERENCES dictionary_entries(id) ON DELETE CASCADE,
          sentence TEXT NOT NULL,
          translation TEXT NOT NULL,
          explanation TEXT NOT NULL,
          provider TEXT NOT NULL DEFAULT 'ollama',
          model TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """);
    jdbc.execute("""
        CREATE TABLE IF NOT EXISTS dictionary_study_cards (
          id TEXT PRIMARY KEY,
          entry_id TEXT NOT NULL REFERENCES dictionary_entries(id) ON DELETE CASCADE,
          example_id TEXT REFERENCES dictionary_examples(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """);
    jdbc.execute("CREATE INDEX IF NOT EXISTS idx_dictionary_entries_term ON dictionary_entries (normalized_term)");
    jdbc.execute("CREATE INDEX IF NOT EXISTS idx_dictionary_entries_translation ON dictionary_entries (lower(translation))");
    jdbc.execute("""
        CREATE TABLE IF NOT EXISTS public_dictionary_sources (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          version TEXT NOT NULL,
          source_url TEXT NOT NULL,
          license TEXT NOT NULL,
          attribution TEXT NOT NULL,
          imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          entry_count INTEGER NOT NULL DEFAULT 0
        )
        """);
    jdbc.execute("""
        CREATE TABLE IF NOT EXISTS public_dictionary_entries (
          id TEXT PRIMARY KEY,
          source_id TEXT NOT NULL REFERENCES public_dictionary_sources(id) ON DELETE CASCADE,
          term TEXT NOT NULL,
          normalized_term TEXT NOT NULL,
          part_of_speech TEXT NOT NULL DEFAULT '',
          dataset_version TEXT NOT NULL DEFAULT '',
          UNIQUE(source_id, normalized_term, part_of_speech)
        )
        """);
    jdbc.execute("ALTER TABLE public_dictionary_entries ADD COLUMN IF NOT EXISTS dataset_version TEXT NOT NULL DEFAULT ''");
    jdbc.execute("""
        CREATE TABLE IF NOT EXISTS public_dictionary_senses (
          id TEXT PRIMARY KEY,
          entry_id TEXT NOT NULL REFERENCES public_dictionary_entries(id) ON DELETE CASCADE,
          definition TEXT NOT NULL,
          position INTEGER NOT NULL DEFAULT 1
        )
        """);
    jdbc.execute("""
        CREATE TABLE IF NOT EXISTS public_dictionary_forms (
          id TEXT PRIMARY KEY,
          entry_id TEXT NOT NULL REFERENCES public_dictionary_entries(id) ON DELETE CASCADE,
          form TEXT NOT NULL,
          tags TEXT NOT NULL DEFAULT ''
        )
        """);
    jdbc.execute("""
        CREATE TABLE IF NOT EXISTS public_dictionary_sounds (
          id TEXT PRIMARY KEY,
          entry_id TEXT NOT NULL REFERENCES public_dictionary_entries(id) ON DELETE CASCADE,
          ipa TEXT NOT NULL DEFAULT '',
          audio_url TEXT NOT NULL DEFAULT ''
        )
        """);
    jdbc.execute("""
        CREATE TABLE IF NOT EXISTS public_dictionary_import_checkpoints (
          source_id TEXT PRIMARY KEY REFERENCES public_dictionary_sources(id) ON DELETE CASCADE,
          dataset_version TEXT NOT NULL,
          source_url TEXT NOT NULL,
          last_line BIGINT NOT NULL DEFAULT 0,
          skipped_lines BIGINT NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """);
    jdbc.execute("ALTER TABLE public_dictionary_import_checkpoints ADD COLUMN IF NOT EXISTS total_lines BIGINT");
    jdbc.execute("ALTER TABLE public_dictionary_import_checkpoints ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'PAUSED'");
    jdbc.execute("ALTER TABLE public_dictionary_import_checkpoints ADD COLUMN IF NOT EXISTS error_message TEXT");
    jdbc.execute("CREATE INDEX IF NOT EXISTS idx_public_dictionary_entries_term ON public_dictionary_entries (normalized_term)");
    jdbc.execute("CREATE INDEX IF NOT EXISTS idx_public_dictionary_entries_term_prefix ON public_dictionary_entries (term text_pattern_ops)");
    jdbc.execute("""
        CREATE TABLE IF NOT EXISTS english_portuguese_dictionary_entries (
          id TEXT PRIMARY KEY,
          source_id TEXT NOT NULL REFERENCES public_dictionary_sources(id) ON DELETE CASCADE,
          term TEXT NOT NULL,
          normalized_term TEXT NOT NULL,
          translation TEXT NOT NULL,
          part_of_speech TEXT NOT NULL DEFAULT '',
          dataset_version TEXT NOT NULL DEFAULT '',
          UNIQUE(source_id, normalized_term, translation, part_of_speech)
        )
        """);
    jdbc.execute("CREATE INDEX IF NOT EXISTS idx_en_pt_entries_term ON english_portuguese_dictionary_entries (normalized_term)");
    jdbc.execute("CREATE INDEX IF NOT EXISTS idx_en_pt_entries_translation ON english_portuguese_dictionary_entries (lower(translation))");
    // Older imports used the alphabetical headword (for example, "amends")
    // instead of the expression that follows it (for example, "make amends").
    // Repair only the recognizably English expression-shaped rows.
    jdbc.update("""
        WITH repaired AS (
          SELECT e.id,
            trim(regexp_replace(regexp_replace(s.definition, '\\s*\\([^)]*\\)', '', 'g'), '\\s+', ' ', 'g')) AS expression
          FROM dictionary_entries e
          JOIN dictionary_senses s ON s.entry_id = e.id AND s.position = 1
          WHERE e.term !~ '\\s'
            AND lower(s.definition) ~ '^(be|make|have|take|give|go|get|keep|let|put|come|fall|find|hold|lose|pay|play|run|see|set|show|stand|stick|throw|turn|break|bring|call|carry|catch|cut|do|draw|drive|drop|eat|face|feel|fill|follow|forget|hand|hit|join|leave|live|look|miss|move|pick|pull|reach|save|send|shake|sleep|speak|spend|start|stay|step|swim|talk|think|try|walk|watch|wear|win|wipe)\\s'
        )
         UPDATE dictionary_entries e
         SET headword = e.term, term = repaired.expression, normalized_term = lower(repaired.expression)
        FROM repaired
        WHERE e.id = repaired.id
        """);
  }
}