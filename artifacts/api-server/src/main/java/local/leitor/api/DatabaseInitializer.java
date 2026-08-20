package local.leitor.api;

import jakarta.annotation.PostConstruct;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseInitializer {
  private final JdbcTemplate jdbc;

  DatabaseInitializer(JdbcTemplate jdbc) {
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
  }
}