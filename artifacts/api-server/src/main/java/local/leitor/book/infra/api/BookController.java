package local.leitor.book.infra.api;

import java.util.List;
import java.util.Map;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import local.leitor.book.application.port.in.GetBookDetailUseCase;
import local.leitor.book.application.port.in.DeleteBookUseCase;
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
    private final DeleteBookUseCase deleteBookUseCase;

    public BookController(
        ListBooksUseCase listBooksUseCase,
        ImportBookUseCase importBookUseCase,
        GetBookDetailUseCase getBookDetailUseCase,
        DeleteBookUseCase deleteBookUseCase
    ) {
        this.listBooksUseCase = listBooksUseCase;
        this.importBookUseCase = importBookUseCase;
        this.getBookDetailUseCase = getBookDetailUseCase;
        this.deleteBookUseCase = deleteBookUseCase;
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

    @PostMapping(value = "/prepare", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public StreamingResponseBody prepareBook(@RequestBody BookInputRequest request) {
        return output -> {
            try {
                writeEvent(output, "progress", Map.of("stage", "extracting", "completedChunks", 0, "totalChunks", 0));
                Book imported = importBookUseCase instanceof local.leitor.book.application.service.BookApplicationService service
                    ? service.importBook(request.toCommand(), progress -> {
                        try {
                            writeEvent(output, "progress", Map.of(
                                "stage", progress.stage(),
                                "completedChunks", progress.completedChunks(),
                                "totalChunks", progress.totalChunks()
                            ));
                        } catch (IOException ex) {
                            throw new IllegalStateException("Preparation progress stream closed", ex);
                        }
                    })
                    : importBookUseCase.importBook(request.toCommand());
                writeEvent(output, "complete", BookResponse.fromDomain(imported));
            } catch (Exception ex) {
                writeEvent(output, "error", Map.of(
                    "message", "A preparação falhou durante um dos blocos. Verifica as Preferências e tenta novamente."
                ));
            }
        };
    }

    private void writeEvent(java.io.OutputStream output, String event, Object data) throws IOException {
        String payload = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(data);
        output.write(("event: " + event + "\ndata: " + payload + "\n\n").getBytes(java.nio.charset.StandardCharsets.UTF_8));
        output.flush();
    }

    @GetMapping("/{bookId}")
    public BookDetailResponse get(@PathVariable String bookId) {
        Book book = getBookDetailUseCase.getBookDetail(BookId.of(bookId));
        return BookDetailResponse.fromDomain(book);
    }

    @DeleteMapping("/{bookId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String bookId) {
        deleteBookUseCase.deleteBook(BookId.of(bookId));
    }
}
