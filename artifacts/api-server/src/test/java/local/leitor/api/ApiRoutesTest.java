package local.leitor.api;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import local.leitor.book.application.port.in.GetBookDetailUseCase;
import local.leitor.book.application.port.in.ImportBookUseCase;
import local.leitor.book.application.service.BookApplicationService;
import local.leitor.book.domain.model.Book;
import local.leitor.book.domain.model.BookId;
import local.leitor.book.domain.model.BookStatus;
import local.leitor.book.domain.model.CefrLevel;
import local.leitor.book.domain.model.SourceType;
import local.leitor.book.infra.api.BookController;
import local.leitor.engine.domain.model.StudyPlan;
import local.leitor.health.infra.api.HealthController;
import local.leitor.shared.infra.api.GlobalExceptionHandler;
import local.leitor.study.application.port.in.GetDashboardUseCase;
import local.leitor.study.application.port.in.SyncStudyPlansUseCase;
import local.leitor.study.domain.model.DashboardSummary;
import local.leitor.study.infra.api.StudyController;

@WebMvcTest({BookController.class, StudyController.class, HealthController.class})
@Import(GlobalExceptionHandler.class)
class ApiRoutesTest {

    @Autowired
    private MockMvc mvc;

    @MockBean
    private BookApplicationService bookApplicationService;

    @MockBean
    private GetDashboardUseCase getDashboardUseCase;

    @MockBean
    private SyncStudyPlansUseCase syncStudyPlansUseCase;

    @Test
    @DisplayName("GET /api/healthz returns 200 OK with status ok")
    void healthRouteStaysAvailable() throws Exception {
        mvc.perform(get("/api/healthz"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("ok"));
    }

    @Test
    @DisplayName("GET /api/books returns 200 OK and matches expected JSON contract")
    void booksRouteKeepsItsResponseShape() throws Exception {
        Book book = Book.reconstitute(
            BookId.of("book-1"),
            "The Dispossessed",
            "Ursula K. Le Guin",
            SourceType.EPUB,
            BookStatus.READY,
            CefrLevel.B2,
            0,
            "#D7F0E5",
            "",
            StudyPlan.empty(),
            Collections.emptyList(),
            Instant.parse("2026-08-20T18:00:00Z")
        );

        given(bookApplicationService.listBooks()).willReturn(List.of(book));

        mvc.perform(get("/api/books"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value("book-1"))
            .andExpect(jsonPath("$[0].title").value("The Dispossessed"))
            .andExpect(jsonPath("$[0].author").value("Ursula K. Le Guin"))
            .andExpect(jsonPath("$[0].sourceType").value("EPUB"))
            .andExpect(jsonPath("$[0].status").value("READY"))
            .andExpect(jsonPath("$[0].level").value("B2"))
            .andExpect(jsonPath("$[0].progress").value(0))
            .andExpect(jsonPath("$[0].coverColor").value("#D7F0E5"))
            .andExpect(jsonPath("$[0].updatedAt").value("2026-08-20T18:00:00Z"));
    }

    @Test
    @DisplayName("DELETE /api/books/{bookId} removes a book and returns 204")
    void deleteBookRouteReturnsNoContent() throws Exception {
        mvc.perform(delete("/api/books/book-1"))
            .andExpect(status().isNoContent());

        verify(bookApplicationService).deleteBook(BookId.of("book-1"));
    }

    @Test
    @DisplayName("GET /api/dashboard returns 200 OK with metrics and current book")
    void dashboardRouteWorksProperly() throws Exception {
        Book book = Book.reconstitute(
            BookId.of("book-1"),
            "The Dispossessed",
            "Ursula K. Le Guin",
            SourceType.EPUB,
            BookStatus.READY,
            CefrLevel.B2,
            0,
            "#D7F0E5",
            "",
            StudyPlan.empty(),
            Collections.emptyList(),
            Instant.parse("2026-08-20T18:00:00Z")
        );

        given(getDashboardUseCase.getDashboard()).willReturn(new DashboardSummary(18, 4, 47, book));

        mvc.perform(get("/api/dashboard"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.minutesToday").value(18))
            .andExpect(jsonPath("$.streak").value(4))
            .andExpect(jsonPath("$.wordsLearned").value(47))
            .andExpect(jsonPath("$.currentBook.title").value("The Dispossessed"));
    }

    @Test
    @DisplayName("GET /api/study/sync returns prepared books list")
    void studySyncRouteWorksProperly() throws Exception {
        Book book = Book.reconstitute(
            BookId.of("book-1"),
            "The Dispossessed",
            "Ursula K. Le Guin",
            SourceType.EPUB,
            BookStatus.READY,
            CefrLevel.B2,
            0,
            "#D7F0E5",
            "",
            StudyPlan.empty(),
            Collections.emptyList(),
            Instant.parse("2026-08-20T18:00:00Z")
        );

        given(syncStudyPlansUseCase.getPreparedBooksForSync()).willReturn(List.of(book));

        mvc.perform(get("/api/study/sync"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.books[0].id").value("book-1"))
            .andExpect(jsonPath("$.books[0].title").value("The Dispossessed"))
            .andExpect(jsonPath("$.books[0].plan.vocabulary").isArray());
    }
}