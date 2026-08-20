package local.leitor.book.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import local.leitor.book.application.port.BookRepository;
import local.leitor.book.domain.Book;
import local.leitor.book.domain.Chapter;

class BookQueryServiceTest {
  private final Book book = new Book(
      "book-1", "The Left Hand of Darkness", "Ursula K. Le Guin",
      "EPUB", "READY", "B2", 0, "#D7F0E5", "2026-08-20T18:00:00Z"
  );

  @Test
  void exposesBookDetailsWithPlanAndChapters() {
    BookQueryService service = new BookQueryService(new InMemoryBookRepository());

    Map<String, Object> detail = service.get(book.id());

    assertThat(detail)
        .containsEntry("id", book.id())
        .containsEntry("title", book.title())
        .containsKey("plan")
        .containsKey("chapters");
    assertThat((List<?>) detail.get("chapters")).hasSize(1);
  }

  @Test
  void omitsChaptersFromMobileSyncPayload() {
    BookQueryService service = new BookQueryService(new InMemoryBookRepository());

    List<Map<String, Object>> payload = service.readyForSync();

    assertThat(payload).hasSize(1);
    assertThat(payload.getFirst()).doesNotContainKey("chapters");
    assertThat(payload.getFirst()).containsEntry("id", book.id());
  }

  private final class InMemoryBookRepository implements BookRepository {
    @Override
    public List<Book> findAll() {
      return List.of(book);
    }

    @Override
    public List<Book> findReady() {
      return List.of(book);
    }

    @Override
    public Book findById(String id) {
      return book;
    }

    @Override
    public List<Chapter> findChapters(String bookId) {
      return List.of(new Chapter("chapter-1", 1, "Chapter one", "Content", 1));
    }

    @Override
    public Object findPlan(String bookId) {
      return Map.of("vocabulary", List.of(), "idioms", List.of(), "phrasalVerbs", List.of());
    }

    @Override
    public Book save(Book storedBook, String content, String plan, List<Chapter> chapters) {
      return storedBook;
    }
  }
}