package local.leitor.book.infra.api;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import local.leitor.book.application.port.in.GetBookDetailUseCase;
import local.leitor.book.application.port.in.ImportBookUseCase;
import local.leitor.book.application.port.in.ListBooksUseCase;
import local.leitor.book.domain.model.Book;
import local.leitor.book.domain.model.BookId;
import local.leitor.book.infra.api.dto.BookDetailResponse;
import local.leitor.book.infra.api.dto.BookInputRequest;
import local.leitor.book.infra.api.dto.BookResponse;

@RestController
@RequestMapping("/api/books")
@CrossOrigin
public class BookController {
    private final ListBooksUseCase listBooksUseCase;
    private final ImportBookUseCase importBookUseCase;
    private final GetBookDetailUseCase getBookDetailUseCase;

    public BookController(
        ListBooksUseCase listBooksUseCase,
        ImportBookUseCase importBookUseCase,
        GetBookDetailUseCase getBookDetailUseCase
    ) {
        this.listBooksUseCase = listBooksUseCase;
        this.importBookUseCase = importBookUseCase;
        this.getBookDetailUseCase = getBookDetailUseCase;
    }

    @GetMapping
    public List<BookResponse> list() {
        return listBooksUseCase.listBooks().stream()
            .map(BookResponse::fromDomain)
            .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BookResponse importBook(@RequestBody BookInputRequest request) {
        Book imported = importBookUseCase.importBook(request.toCommand());
        return BookResponse.fromDomain(imported);
    }

    @GetMapping("/{bookId}")
    public BookDetailResponse get(@PathVariable String bookId) {
        Book book = getBookDetailUseCase.getBookDetail(BookId.of(bookId));
        return BookDetailResponse.fromDomain(book);
    }
}
