package local.leitor.api;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;
import local.leitor.book.api.BookController;
import local.leitor.book.application.BookImportService;
import local.leitor.book.application.BookQueryService;
import local.leitor.book.domain.Book;
import local.leitor.health.api.HealthController;
import local.leitor.study.api.StudyController;
import local.leitor.study.application.StudyDashboardService;
import local.leitor.study.application.StudySyncService;

@WebMvcTest({BookController.class, StudyController.class, HealthController.class})
class ApiRoutesTest {
  @Autowired
  private MockMvc mvc;

  @MockBean
  private BookQueryService bookQueryService;

  @MockBean
  private BookImportService bookImportService;

  @MockBean
  private StudyDashboardService dashboardService;

  @MockBean
  private StudySyncService syncService;

  @Test
  void healthRouteStaysAvailable() throws Exception {
    mvc.perform(get("/api/healthz"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("ok"));
  }

  @Test
  void booksRouteKeepsItsResponseShape() throws Exception {
    given(bookQueryService.list()).willReturn(List.of(new Book(
        "book-1", "The Dispossessed", "Ursula K. Le Guin",
        "EPUB", "READY", "B2", 0, "#D7F0E5", "2026-08-20T18:00:00Z"
    )));

    mvc.perform(get("/api/books"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value("book-1"))
        .andExpect(jsonPath("$[0].sourceType").value("EPUB"))
        .andExpect(jsonPath("$[0].updatedAt").value("2026-08-20T18:00:00Z"));
  }
}