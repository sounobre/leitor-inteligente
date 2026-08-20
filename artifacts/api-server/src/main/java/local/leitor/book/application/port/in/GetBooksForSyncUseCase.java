package local.leitor.book.application.port.in;

import java.util.List;
import local.leitor.book.domain.model.Book;

public interface GetBooksForSyncUseCase {
    List<Book> getReadyBooksForSync();
}
