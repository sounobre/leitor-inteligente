package local.leitor.book.infra.persistence;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import local.leitor.book.application.port.out.BookRepositoryPort;
import local.leitor.book.domain.model.Book;
import local.leitor.book.domain.model.BookId;
import local.leitor.book.domain.model.Chapter;
import local.leitor.shared.domain.DomainException;

/**
 * JDBC persistence adapter implementing BookRepositoryPort.
 */
@Repository
public class JdbcBookRepositoryAdapter implements BookRepositoryPort {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final BookRowMapper bookMapper;

    public JdbcBookRepositoryAdapter(JdbcTemplate jdbc, ObjectMapper json, BookRowMapper bookMapper) {
        this.jdbc = jdbc;
        this.json = json;
        this.bookMapper = bookMapper;
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
    public Optional<Book> findById(BookId id) {
        List<Book> books = jdbc.query("""
            SELECT id, title, author, source_type, status, level, progress, cover_color, content, plan::text as plan, updated_at
            FROM books WHERE id = ?
            """, bookMapper, id.value());

        if (books.isEmpty()) {
            return Optional.empty();
        }

        Book baseBook = books.getFirst();
        List<Chapter> chapters = findChaptersByBookId(id);

        Book fullBook = Book.reconstitute(
            baseBook.getId(),
            baseBook.getTitle(),
            baseBook.getAuthor(),
            baseBook.getSourceType(),
            baseBook.getStatus(),
            baseBook.getLevel(),
            baseBook.getProgress(),
            baseBook.getCoverColor(),
            baseBook.getContent(),
            baseBook.getPlan(),
            chapters,
            baseBook.getUpdatedAt()
        );

        return Optional.of(fullBook);
    }

    @Override
    public boolean deleteById(BookId id) {
        return jdbc.update("DELETE FROM books WHERE id = ?", id.value()) > 0;
    }

    @Override
    public Book save(Book book) {
        String planJson;
        try {
            planJson = json.writeValueAsString(book.getPlan());
        } catch (JsonProcessingException e) {
            throw new DomainException("Could not serialize StudyPlan for persistence", e) {};
        }

        jdbc.update("""
            INSERT INTO books (id, title, author, source_type, status, level, progress, cover_color, content, plan)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS jsonb))
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                author = EXCLUDED.author,
                source_type = EXCLUDED.source_type,
                status = EXCLUDED.status,
                level = EXCLUDED.level,
                progress = EXCLUDED.progress,
                cover_color = EXCLUDED.cover_color,
                content = EXCLUDED.content,
                plan = EXCLUDED.plan,
                updated_at = NOW()
            """,
            book.getId().value(),
            book.getTitle(),
            book.getAuthor(),
            book.getSourceType().name(),
            book.getStatus().name(),
            book.getLevel().name(),
            book.getProgress(),
            book.getCoverColor(),
            book.getContent(),
            planJson
        );

        // Delete existing chapters if update, then insert current chapters
        jdbc.update("DELETE FROM book_chapters WHERE book_id = ?", book.getId().value());

        for (Chapter chapter : book.getChapters()) {
            jdbc.update("""
                INSERT INTO book_chapters (id, book_id, position, title, content, word_count)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                chapter.id(),
                book.getId().value(),
                chapter.position(),
                chapter.title(),
                chapter.content(),
                chapter.wordCount()
            );
        }

        return findById(book.getId()).orElse(book);
    }

    private List<Chapter> findChaptersByBookId(BookId bookId) {
        return jdbc.query("""
            SELECT id, position, title, content, word_count
            FROM book_chapters
            WHERE book_id = ?
            ORDER BY position
            """, (rs, rowNum) -> new Chapter(
                rs.getString("id"),
                rs.getInt("position"),
                rs.getString("title"),
                rs.getString("content"),
                rs.getInt("word_count")
            ), bookId.value());
    }
}
