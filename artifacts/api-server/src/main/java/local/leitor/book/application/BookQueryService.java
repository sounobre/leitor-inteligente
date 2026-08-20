package local.leitor.book.application;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import local.leitor.book.application.port.BookRepository;
import local.leitor.book.domain.Book;
import local.leitor.book.domain.Chapter;

@Service
public class BookQueryService {
  private final BookRepository repository;

  public BookQueryService(BookRepository repository) {
    this.repository = repository;
  }

  public List<Book> list() {
    return repository.findAll();
  }

  public Map<String, Object> get(String bookId) {
    Book book = repository.findById(bookId);
    List<Chapter> chapters = repository.findChapters(bookId);
    Map<String, Object> detail = new HashMap<>();
    detail.put("id", book.id());
    detail.put("title", book.title());
    detail.put("author", book.author());
    detail.put("sourceType", book.sourceType());
    detail.put("status", book.status());
    detail.put("level", book.level());
    detail.put("progress", book.progress());
    detail.put("coverColor", book.coverColor());
    detail.put("updatedAt", book.updatedAt());
    detail.put("plan", repository.findPlan(bookId));
    detail.put("chapters", chapters);
    return detail;
  }

  public List<Map<String, Object>> readyForSync() {
    return repository.findReady().stream().map(book -> {
      Map<String, Object> detail = new HashMap<>(get(book.id()));
      detail.remove("chapters");
      return detail;
    }).toList();
  }
}