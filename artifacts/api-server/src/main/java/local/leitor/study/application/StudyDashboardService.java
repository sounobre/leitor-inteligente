package local.leitor.study.application;

import java.time.OffsetDateTime;
import java.util.Map;
import org.springframework.stereotype.Service;
import local.leitor.book.application.BookQueryService;
import local.leitor.book.domain.Book;

@Service
public class StudyDashboardService {
  private final BookQueryService bookQueryService;

  public StudyDashboardService(BookQueryService bookQueryService) {
    this.bookQueryService = bookQueryService;
  }

  public Map<String, Object> dashboard() {
    Book current = bookQueryService.list().stream().findFirst().orElseGet(this::starterBook);
    return Map.of(
        "minutesToday", 18,
        "streak", 4,
        "wordsLearned", 47,
        "currentBook", current
    );
  }

  private Book starterBook() {
    return new Book(
        "starter",
        "Wuthering Heights",
        "Emily Brontë",
        "EPUB",
        "READY",
        "B2",
        24,
        "#D7F0E5",
        OffsetDateTime.now().toString()
    );
  }
}