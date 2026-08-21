package local.leitor.book.application.port.in;

import local.leitor.book.domain.model.BookId;

public interface DeleteBookUseCase {
    void deleteBook(BookId id);
}