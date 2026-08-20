package local.leitor.book.application.port.in;

import local.leitor.book.application.dto.ImportBookCommand;
import local.leitor.book.domain.model.Book;

public interface ImportBookUseCase {
    Book importBook(ImportBookCommand command);
}
