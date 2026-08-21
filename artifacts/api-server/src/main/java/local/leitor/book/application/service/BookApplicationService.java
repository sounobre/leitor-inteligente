package local.leitor.book.application.service;

import java.util.List;
import java.util.stream.Collectors;
import java.util.function.Consumer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import local.leitor.book.application.dto.ImportBookCommand;
import local.leitor.book.application.dto.PreparationProgress;
import local.leitor.book.application.port.in.GetBookDetailUseCase;
import local.leitor.book.application.port.in.GetBooksForSyncUseCase;
import local.leitor.book.application.port.in.ImportBookUseCase;
import local.leitor.book.application.port.in.ListBooksUseCase;
import local.leitor.book.application.port.in.DeleteBookUseCase;
import local.leitor.book.application.port.out.BookContentExtractorPort;
import local.leitor.book.application.port.out.BookRepositoryPort;
import local.leitor.book.domain.exception.BookNotFoundException;
import local.leitor.book.domain.model.Book;
import local.leitor.book.domain.model.BookId;
import local.leitor.book.domain.model.Chapter;
import local.leitor.book.infra.extraction.ContentExtractorFactory;
import local.leitor.engine.application.port.out.StudyPlanGeneratorPort;
import local.leitor.engine.domain.model.StudyPlan;

/**
 * Application service orchestrating Book use cases.
 */
@Service
@Transactional(readOnly = true)
public class BookApplicationService implements
    ImportBookUseCase,
    ListBooksUseCase,
    GetBookDetailUseCase,
    DeleteBookUseCase,
    GetBooksForSyncUseCase {

    private final BookRepositoryPort repository;
    private final ContentExtractorFactory extractorFactory;
    private final StudyPlanGeneratorPort studyPlanGenerator;

    public BookApplicationService(
        BookRepositoryPort repository,
        ContentExtractorFactory extractorFactory,
        StudyPlanGeneratorPort studyPlanGenerator
    ) {
        this.repository = repository;
        this.extractorFactory = extractorFactory;
        this.studyPlanGenerator = studyPlanGenerator;
    }

    @Override
    @Transactional
    public Book importBook(ImportBookCommand command) {
        return importBook(command, null);
    }

    @Transactional
    public Book importBook(ImportBookCommand command, Consumer<PreparationProgress> progressListener) {
        Consumer<PreparationProgress> listener = progressListener == null ? progress -> {} : progressListener;
        BookContentExtractorPort extractor = extractorFactory.getExtractor(command.sourceType());
        listener.accept(PreparationProgress.extracting());
        List<Chapter> chapters = extractor.extract(command.content(), command.fileName());

        String aggregatedContent = chapters.stream()
            .map(Chapter::content)
            .filter(c -> !c.isBlank())
            .collect(Collectors.joining("\n\n"));

        StudyPlan studyPlan = "openrouter".equalsIgnoreCase(command.provider())
            ? progressListener == null
                ? studyPlanGenerator.generatePlan(
                    command.provider(),
                    command.ollamaEndpoint(),
                    command.ollamaModel(),
                    aggregatedContent
                )
                : studyPlanGenerator.generatePlan(
                command.provider(),
                command.ollamaEndpoint(),
                command.ollamaModel(),
                aggregatedContent,
                progress -> listener.accept(PreparationProgress.preparing(
                    progress.completedChunks(), progress.totalChunks(), progress.activity()
                ))
                )
            : progressListener == null
                ? studyPlanGenerator.generatePlan(
                    command.ollamaEndpoint(), command.ollamaModel(), aggregatedContent
                )
                : studyPlanGenerator.generatePlan(
                    command.ollamaEndpoint(),
                    command.ollamaModel(),
                    aggregatedContent,
                    progress -> listener.accept(PreparationProgress.preparing(
                        progress.completedChunks(), progress.totalChunks(), progress.activity()
                    ))
                );

        Book book = Book.create(
            command.title(),
            command.author(),
            command.sourceType(),
            aggregatedContent,
            chapters,
            studyPlan
        );

        return repository.save(book);
    }

    @Override
    public List<Book> listBooks() {
        return repository.findAll();
    }

    @Override
    public Book getBookDetail(BookId id) {
        return repository.findById(id)
            .orElseThrow(() -> new BookNotFoundException(id));
    }

    @Override
    @Transactional
    public void deleteBook(BookId id) {
        if (!repository.deleteById(id)) {
            throw new BookNotFoundException(id);
        }
    }

    @Override
    public List<Book> getReadyBooksForSync() {
        return repository.findReady();
    }
}
