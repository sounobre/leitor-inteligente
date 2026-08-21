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
          term TEXT NOT NULL,
          normalized_term TEXT NOT NULL,
          translation TEXT NOT NULL,
          part_of_speech TEXT NOT NULL DEFAULT 'expressão',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(source_id, normalized_term)
        )
        """);
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
  }
}