package local.leitor.book.application.service;

import java.util.List;
import java.time.Instant;
import java.util.stream.Collectors;
import java.util.function.Consumer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.context.annotation.Primary;
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
import local.leitor.book.domain.model.VocabularyWord;
import local.leitor.book.application.VocabularyExtractor;
import local.leitor.book.infra.extraction.ContentExtractorFactory;
import local.leitor.engine.application.port.out.StudyPlanGeneratorPort;
import local.leitor.engine.domain.model.StudyPlan;

/**
 * Application service orchestrating Book use cases.
 */
@Service
@Primary
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
    private final VocabularyExtractor vocabularyExtractor;

    @Autowired
    public BookApplicationService(
        BookRepositoryPort repository,
        ContentExtractorFactory extractorFactory,
        StudyPlanGeneratorPort studyPlanGenerator,
        VocabularyExtractor vocabularyExtractor
    ) {
        this.repository = repository;
        this.extractorFactory = extractorFactory;
        this.studyPlanGenerator = studyPlanGenerator;
        this.vocabularyExtractor = vocabularyExtractor;
    }

    public BookApplicationService(
        BookRepositoryPort repository,
        ContentExtractorFactory extractorFactory,
        StudyPlanGeneratorPort studyPlanGenerator
    ) {
        this(repository, extractorFactory, studyPlanGenerator, new VocabularyExtractor());
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

        Book saved = repository.save(book);
        repository.saveVocabulary(saved.getId(), vocabularyExtractor.extract(chapters));
        return saved;
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

    @Transactional
    public Book updateReadingPosition(BookId id, int chapter, int offset, int progress, Instant clientUpdatedAt) {
        if (chapter < 1 || offset < 0 || progress < 0 || progress > 100) {
            throw new local.leitor.shared.domain.BusinessValidationException("Posição de leitura inválida");
        }
        return repository.updateReadingPosition(id, chapter, offset, progress, clientUpdatedAt == null ? Instant.now() : clientUpdatedAt);
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

    public List<VocabularyWord> getVocabulary(BookId id, String query, int limit, int offset) {
        List<VocabularyWord> words = repository.findVocabulary(id, query, limit, offset);
        if (words.isEmpty() && (query == null || query.isBlank()) && offset == 0) {
            Book book = getBookDetail(id);
            List<VocabularyWord> extracted = vocabularyExtractor.extract(book.getChapters());
            repository.saveVocabulary(id, extracted);
            return extracted.stream().limit(limit).toList();
        }
        return words;
    }

    @Transactional
    public int createVocabularyCards(BookId id, List<String> normalizedTerms) {
        if (normalizedTerms == null || normalizedTerms.isEmpty()) return 0;
        getBookDetail(id);
        return repository.createVocabularyCards(id, normalizedTerms);
    }
}
