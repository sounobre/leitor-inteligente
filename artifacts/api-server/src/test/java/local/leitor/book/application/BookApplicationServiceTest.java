package local.leitor.book.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import local.leitor.book.application.dto.ImportBookCommand;
import local.leitor.book.application.VocabularyExtractor;
import local.leitor.book.application.port.out.BookContentExtractorPort;
import local.leitor.book.application.port.out.BookRepositoryPort;
import local.leitor.book.application.service.BookApplicationService;
import local.leitor.book.domain.exception.BookNotFoundException;
import local.leitor.book.domain.model.Book;
import local.leitor.book.domain.model.BookId;
import local.leitor.book.domain.model.Chapter;
import local.leitor.book.domain.model.SourceType;
import local.leitor.book.infra.extraction.ContentExtractorFactory;
import local.leitor.engine.application.port.out.StudyPlanGeneratorPort;
import local.leitor.engine.domain.model.StudyPlan;

@ExtendWith(MockitoExtension.class)
class BookApplicationServiceTest {

    @Mock
    private BookRepositoryPort repository;

    @Mock
    private ContentExtractorFactory extractorFactory;

    @Mock
    private BookContentExtractorPort contentExtractor;

    @Mock
    private StudyPlanGeneratorPort studyPlanGenerator;

    @Mock
    private VocabularyExtractor vocabularyExtractor;

    private BookApplicationService service;

    @BeforeEach
    void setUp() {
        service = new BookApplicationService(repository, extractorFactory, studyPlanGenerator, vocabularyExtractor);
    }

    @Test
    @DisplayName("Should orchestrate book import successfully")
    void shouldImportBookSuccessfully() {
        ImportBookCommand command = new ImportBookCommand(
            "Clean Code",
            "Robert C. Martin",
            SourceType.EPUB,
            "base64data",
            "clean_code.epub",
            "http://localhost:11434",
            "llama3"
        );

        List<Chapter> chapters = List.of(Chapter.of(1, "Clean Code Chapter 1", "Meaningful names matter."));
        StudyPlan plan = StudyPlan.empty();

        given(extractorFactory.getExtractor(SourceType.EPUB)).willReturn(contentExtractor);
        given(contentExtractor.extract("base64data", "clean_code.epub")).willReturn(chapters);
        given(studyPlanGenerator.generatePlan("http://localhost:11434", "llama3", "Meaningful names matter.")).willReturn(plan);
        given(repository.save(any(Book.class))).willAnswer(invocation -> invocation.getArgument(0));

        Book imported = service.importBook(command);

        assertThat(imported).isNotNull();
        assertThat(imported.getTitle()).isEqualTo("Clean Code");
        assertThat(imported.getAuthor()).isEqualTo("Robert C. Martin");
        verify(repository).save(any(Book.class));
    }

    @Test
    @DisplayName("Should throw BookNotFoundException when book does not exist")
    void shouldThrowExceptionWhenBookNotFound() {
        BookId id = BookId.of("non-existent");
        given(repository.findById(id)).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.getBookDetail(id))
            .isInstanceOf(BookNotFoundException.class)
            .hasMessageContaining("non-existent");
    }
}
