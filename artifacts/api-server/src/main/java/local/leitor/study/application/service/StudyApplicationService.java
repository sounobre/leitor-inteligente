package local.leitor.study.application.service;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import local.leitor.book.application.port.out.BookRepositoryPort;
import local.leitor.book.domain.model.Book;
import local.leitor.book.domain.model.BookId;
import local.leitor.book.domain.model.BookStatus;
import local.leitor.book.domain.model.CefrLevel;
import local.leitor.book.domain.model.SourceType;
import local.leitor.engine.domain.model.StudyPlan;
import local.leitor.study.application.port.in.GetDashboardUseCase;
import local.leitor.study.application.port.in.SyncStudyPlansUseCase;
import local.leitor.study.domain.model.DashboardSummary;

@Service
@Transactional(readOnly = true)
public class StudyApplicationService implements GetDashboardUseCase, SyncStudyPlansUseCase {
    private final BookRepositoryPort bookRepository;

    public StudyApplicationService(BookRepositoryPort bookRepository) {
        this.bookRepository = bookRepository;
    }

    @Override
    public DashboardSummary getDashboard() {
        Book current = bookRepository.findAll().stream()
            .findFirst()
            .orElseGet(this::createDefaultStarterBook);

        return new DashboardSummary(
            18,
            4,
            47,
            current
        );
    }

    @Override
    public List<Book> getPreparedBooksForSync() {
        return bookRepository.findReady();
    }

    private Book createDefaultStarterBook() {
        return Book.reconstitute(
            BookId.of("starter"),
            "Wuthering Heights",
            "Emily Brontë",
            SourceType.EPUB,
            BookStatus.READY,
            CefrLevel.B2,
            24,
            "#D7F0E5",
            "",
            StudyPlan.empty(),
            Collections.emptyList(),
            Instant.now()
        );
    }
}
