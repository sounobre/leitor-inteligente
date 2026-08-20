package local.leitor.study.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import local.leitor.book.application.port.out.BookRepositoryPort;
import local.leitor.book.domain.model.Book;
import local.leitor.book.domain.model.SourceType;
import local.leitor.engine.domain.model.StudyPlan;
import local.leitor.study.application.service.StudyApplicationService;
import local.leitor.study.domain.model.DashboardSummary;

@ExtendWith(MockitoExtension.class)
class StudyApplicationServiceTest {

    @Mock
    private BookRepositoryPort bookRepository;

    private StudyApplicationService service;

    @BeforeEach
    void setUp() {
        service = new StudyApplicationService(bookRepository);
    }

    @Test
    @DisplayName("Should return dashboard summary with existing book")
    void shouldReturnDashboardWithExistingBook() {
        Book book = Book.create(
            "Domain-Driven Design",
            "Eric Evans",
            SourceType.EPUB,
            "Content",
            List.of(),
            StudyPlan.empty()
        );

        given(bookRepository.findAll()).willReturn(List.of(book));

        DashboardSummary summary = service.getDashboard();

        assertThat(summary).isNotNull();
        assertThat(summary.currentBook().getTitle()).isEqualTo("Domain-Driven Design");
        assertThat(summary.minutesToday()).isEqualTo(18);
        assertThat(summary.streak()).isEqualTo(4);
    }
}
