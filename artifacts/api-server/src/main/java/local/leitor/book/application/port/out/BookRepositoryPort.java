package local.leitor.book.application.port.out;

import java.util.List;
import java.util.Optional;
import local.leitor.book.domain.model.Book;
import local.leitor.book.domain.model.BookId;

/**
 * Outbound DDD repository port for persisting and querying Book aggregates.
 */
public interface BookRepositoryPort {
    Book save(Book book);

    List<Book> findAll();

    List<Book> findReady();

    Optional<Book> findById(BookId id);
}
