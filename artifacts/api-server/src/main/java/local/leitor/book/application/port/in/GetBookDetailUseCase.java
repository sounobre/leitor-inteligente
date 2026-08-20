package local.leitor.book.application.port.in;

import local.leitor.book.domain.model.Book;
import local.leitor.book.domain.model.BookId;

public interface GetBookDetailUseCase {
    Book getBookDetail(BookId id);
}
