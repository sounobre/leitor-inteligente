package local.leitor.book.infra.persistence;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Optional;
import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import local.leitor.book.application.port.out.BookRepositoryPort;
import local.leitor.book.domain.model.Book;
import local.leitor.book.domain.model.BookId;
import local.leitor.book.domain.model.Chapter;
import local.leitor.book.domain.model.VocabularyWord;
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
            SELECT id, title, author, source_type, status, level, progress, reading_chapter, reading_offset, cover_color, updated_at
            FROM books ORDER BY updated_at DESC
            """, bookMapper);
    }

    @Override
    public List<Book> findReady() {
        return jdbc.query("""
            SELECT id, title, author, source_type, status, level, progress, reading_chapter, reading_offset, cover_color, updated_at
            FROM books WHERE status = 'READY' ORDER BY updated_at DESC
            """, bookMapper);
    }

    @Override
    public Optional<Book> findById(BookId id) {
        List<Book> books = jdbc.query("""
            SELECT id, title, author, source_type, status, level, progress, reading_chapter, reading_offset, cover_color, content, plan::text as plan, updated_at
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
            baseBook.getProgress(), baseBook.getReadingChapter(), baseBook.getReadingOffset(),
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

    public Book updateReadingPosition(BookId id, int chapter, int offset, int progress, Instant clientUpdatedAt) {
        int updated = jdbc.update("""
            UPDATE books
            SET reading_chapter = ?, reading_offset = ?, progress = ?, reading_position_updated_at = ?, updated_at = NOW()
            WHERE id = ? AND (reading_position_updated_at IS NULL OR reading_position_updated_at <= ?)
            """, chapter, offset, progress, clientUpdatedAt, id.value(), clientUpdatedAt);
        if (updated == 0 && !bookExists(id)) {
            throw new local.leitor.book.domain.exception.BookNotFoundException(id);
        }
        // A stale update is intentionally a no-op: returning the canonical row lets
        // the client reconcile without losing the newer position.
        if (updated == 0) return findById(id).orElseThrow(() -> new local.leitor.book.domain.exception.BookNotFoundException(id));
        return findById(id).orElseThrow(() -> new local.leitor.book.domain.exception.BookNotFoundException(id));
    }

    private boolean bookExists(BookId id) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM books WHERE id = ?)", Boolean.class, id.value()));
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
            INSERT INTO books (id, title, author, source_type, status, level, progress, reading_chapter, reading_offset, cover_color, content, plan)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS jsonb))
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                author = EXCLUDED.author,
                source_type = EXCLUDED.source_type,
                status = EXCLUDED.status,
                level = EXCLUDED.level,
                progress = EXCLUDED.progress,
                reading_chapter = EXCLUDED.reading_chapter,
                reading_offset = EXCLUDED.reading_offset,
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
            book.getReadingChapter(),
            book.getReadingOffset(),
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

    @Override
    public List<VocabularyWord> findVocabulary(BookId id, String query, int limit, int offset) {
        String needle = query == null ? "" : query.trim().toLowerCase();
        return jdbc.query("""
            SELECT term, normalized_term, occurrences, chapters::text, card_created
            FROM book_vocabulary
            WHERE book_id = ? AND (? = '' OR normalized_term LIKE ?)
            ORDER BY normalized_term LIMIT ? OFFSET ?
            """, (rs, row) -> new VocabularyWord(rs.getString("term"), rs.getString("normalized_term"),
                rs.getInt("occurrences"), readChapterList(rs.getString("chapters")), rs.getBoolean("card_created")),
            id.value(), needle, "%" + needle + "%", Math.min(Math.max(limit, 1), 100), Math.max(offset, 0));
    }

    @Override
    public void saveVocabulary(BookId id, List<VocabularyWord> words) {
        for (VocabularyWord word : words) {
            jdbc.update("""
                INSERT INTO book_vocabulary (book_id, term, normalized_term, occurrences, chapters, card_created)
                VALUES (?, ?, ?, ?, CAST(? AS jsonb), FALSE)
                ON CONFLICT (book_id, normalized_term) DO UPDATE SET
                  term = EXCLUDED.term, occurrences = EXCLUDED.occurrences, chapters = EXCLUDED.chapters
                """, id.value(), word.term(), word.normalizedTerm(), word.occurrences(), writeChapters(word.chapters()));
        }
    }

    @Override
    public int createVocabularyCards(BookId id, List<String> normalizedTerms) {
        int created = 0;
        for (String term : normalizedTerms) {
            created += jdbc.update("UPDATE book_vocabulary SET card_created = TRUE WHERE book_id = ? AND normalized_term = ? AND card_created = FALSE", id.value(), term);
        }
        return created;
    }

    private String writeChapters(List<Integer> chapters) {
        try { return json.writeValueAsString(chapters); }
        catch (JsonProcessingException ex) { throw new DomainException("Could not serialize vocabulary chapters", ex) {}; }
    }

    private List<Integer> readChapterList(String value) {
        try {
            return json.readValue(value, json.getTypeFactory().constructCollectionType(List.class, Integer.class));
        } catch (Exception ex) { return List.of(); }
    }
}
