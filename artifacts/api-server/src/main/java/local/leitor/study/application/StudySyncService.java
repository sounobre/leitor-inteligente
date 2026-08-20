package local.leitor.study.application;

import java.util.Map;
import org.springframework.stereotype.Service;
import local.leitor.book.application.BookQueryService;

@Service
public class StudySyncService {
  private final BookQueryService bookQueryService;

  public StudySyncService(BookQueryService bookQueryService) {
    this.bookQueryService = bookQueryService;
  }

  public Map<String, Object> syncPreparedPlans() {
    return Map.of("books", bookQueryService.readyForSync());
  }
}