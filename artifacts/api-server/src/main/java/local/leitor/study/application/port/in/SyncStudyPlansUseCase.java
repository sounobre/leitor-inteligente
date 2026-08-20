package local.leitor.study.application.port.in;

import java.util.List;
import local.leitor.book.domain.model.Book;

public interface SyncStudyPlansUseCase {
    List<Book> getPreparedBooksForSync();
}
