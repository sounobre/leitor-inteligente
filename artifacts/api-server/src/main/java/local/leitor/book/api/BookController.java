package local.leitor.book.api;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import local.leitor.book.application.BookImportService;
import local.leitor.book.application.BookQueryService;
import local.leitor.book.domain.Book;

@RestController
@RequestMapping("/api/books")
@CrossOrigin
public class BookController {
  private final BookQueryService queryService;
  private final BookImportService importService;

  public BookController(BookQueryService queryService, BookImportService importService) {
    this.queryService = queryService;
    this.importService = importService;
  }

  @GetMapping
  public List<Book> list() {
    return queryService.list();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public Book importBook(@RequestBody BookInput input) {
    return importService.importBook(input);
  }

  @GetMapping("/{bookId}")
  public Map<String, Object> get(@PathVariable String bookId) {
    return queryService.get(bookId);
  }
}