package local.leitor.book.infra.persistence;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;
import local.leitor.book.application.port.BookRepository;
import local.leitor.book.domain.Book;
import local.leitor.book.domain.Chapter;

@Repository
public class JdbcBookRepository implements BookRepository {
  private final JdbcTemplate jdbc;
  private final ObjectMapper json;
  private final RowMapper<Book> bookMapper = (rs, rowNum) -> new Book(
      rs.getString("id"),
      rs.getString("title"),
      rs.getString("author"),
      rs.getString("source_type"),
      rs.getString("status"),
      rs.getString("level"),
      rs.getInt("progress"),
      rs.getString("cover_color"),
      rs.getObject("updated_at", OffsetDateTime.class).toString()
  );

  public JdbcBookRepository(JdbcTemplate jdbc, ObjectMapper json) {
    this.jdbc = jdbc;
    this.json = json;
  }

  @Override
  public List<Book> findAll() {
    return jdbc.query("""
        SELECT id, title, author, source_type, status, level, progress, cover_color, updated_at
        FROM books ORDER BY updated_at DESC
        """, bookMapper);
  }

  @Override
  public List<Book> findReady() {
    return jdbc.query("""
        SELECT id, title, author, source_type, status, level, progress, cover_color, updated_at
        FROM books WHERE status = 'READY' ORDER BY updated_at DESC
        """, bookMapper);
  }

  @Override
  public Book findById(String id) {
    List<Book> books = jdbc.query("""
        SELECT id, title, author, source_type, status, level, progress, cover_color, updated_at
        FROM books WHERE id = ?
        """, bookMapper, id);
    if (books.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found");
    }
    return books.getFirst();
  }

  @Override
  public List<Chapter> findChapters(String bookId) {
    return jdbc.query("""
        SELECT id, position, title, content, word_count FROM book_chapters
        WHERE book_id = ? ORDER BY position
        """, (rs, index) -> new Chapter(
        rs.getString("id"),
        rs.getInt("position"),
        rs.getString("title"),
        rs.getString("content"),
        rs.getInt("word_count")
    ), bookId);
  }

  @Override
  public Object findPlan(String bookId) {
    String plan = jdbc.queryForObject("SELECT plan::text FROM books WHERE id = ?", String.class, bookId);
    try {
      return json.readValue(plan, new TypeReference<Map<String, Object>>() {});
    } catch (Exception exception) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Stored study plan is invalid", exception);
    }
  }

  @Override
  public Book save(Book book, String content, String plan, List<Chapter> chapters) {
    jdbc.update("""
        INSERT INTO books (id, title, author, source_type, status, level, progress, cover_color, content, plan)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS jsonb))
        """,
        book.id(),
        book.title(),
        book.author(),
        book.sourceType(),
        book.status(),
        book.level(),
        book.progress(),
        book.coverColor(),
        content,
        plan
    );
    for (Chapter chapter : chapters) {
      jdbc.update("""
          INSERT INTO book_chapters (id, book_id, position, title, content, word_count)
          VALUES (?, ?, ?, ?, ?, ?)
          """,
          chapter.id(),
          book.id(),
          chapter.position(),
          chapter.title(),
          chapter.content(),
          chapter.wordCount()
      );
    }
    return findById(book.id());
  }
}