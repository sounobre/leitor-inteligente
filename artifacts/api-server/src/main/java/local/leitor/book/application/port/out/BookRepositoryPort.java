package local.leitor.book.application.port.out;

import java.util.List;
import java.util.Optional;
import java.time.Instant;
import local.leitor.book.domain.model.Book;
import local.leitor.book.domain.model.BookId;
import local.leitor.book.domain.model.VocabularyWord;

/**
 * Outbound DDD repository port for persisting and querying Book aggregates.
 */
public interface BookRepositoryPort {
    Book save(Book book);

    List<Book> findAll();

    List<Book> findReady();

    Optional<Book> findById(BookId id);

    Book updateReadingPosition(BookId id, int chapter, int offset, int progress, Instant clientUpdatedAt);

    boolean deleteById(BookId id);

    List<VocabularyWord> findVocabulary(BookId id, String query, int limit, int offset);

    void saveVocabulary(BookId id, List<VocabularyWord> words);

    int createVocabularyCards(BookId id, List<String> normalizedTerms);
}
