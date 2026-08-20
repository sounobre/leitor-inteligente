package local.leitor.book.domain.exception;

import local.leitor.book.domain.model.BookId;
import local.leitor.shared.domain.EntityNotFoundException;

public class BookNotFoundException extends EntityNotFoundException {
    public BookNotFoundException(BookId id) {
        super("Book not found with ID: " + id.value());
    }

    public BookNotFoundException(String id) {
        super("Book not found with ID: " + id);
    }
}
