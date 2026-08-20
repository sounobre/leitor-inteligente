package local.leitor.book.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import local.leitor.book.api.BookInput;
import local.leitor.book.application.port.BookContentReader;
import local.leitor.book.application.port.BookRepository;
import local.leitor.book.domain.Book;
import local.leitor.book.domain.Chapter;
import local.leitor.engine.application.OllamaStudyPlanService;

@Service
public class BookImportService {
  private final BookRepository repository;
  private final BookContentReader contentReader;
  private final OllamaStudyPlanService studyPlanService;
  private final ObjectMapper json;

  public BookImportService(
      BookRepository repository,
      BookContentReader contentReader,
      OllamaStudyPlanService studyPlanService,
      ObjectMapper json
  ) {
    this.repository = repository;
    this.contentReader = contentReader;
    this.studyPlanService = studyPlanService;
    this.json = json;
  }

  @Transactional
  public Book importBook(BookInput input) {
    validateInput(input);
    List<Chapter> chapters = "EPUB".equals(input.sourceType())
        ? contentReader.read(input.content(), input.fileName())
        : List.of(new Chapter(
            UUID.randomUUID().toString(),
            1,
            input.title(),
            input.content(),
            countWords(input.content())
        ));
    if (chapters.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The EPUB did not contain readable chapters");
    }
    String fullContent = chapters.stream()
        .map(Chapter::content)
        .reduce("", (a, b) -> a.isBlank() ? b : a + "\n\n" + b);
    String plan = writePlan(studyPlanService.createStudyPlan(
        input.ollamaEndpoint(), input.ollamaModel(), fullContent
    ));
    Book book = new Book(
        UUID.randomUUID().toString(),
        input.title().trim(),
        input.author() == null || input.author().isBlank() ? "Autor desconhecido" : input.author().trim(),
        input.sourceType(),
        "READY",
        "B2",
        0,
        "#D7F0E5",
        null
    );
    return repository.save(book, fullContent, plan, chapters);
  }

  private void validateInput(BookInput input) {
    if (input == null || input.title() == null || input.title().isBlank()
        || input.content() == null || input.content().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title and content are required");
    }
    if (input.sourceType() == null || input.sourceType().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Source type is required");
    }
  }

  private String writePlan(Object plan) {
    try {
      return json.writeValueAsString(plan);
    } catch (JsonProcessingException exception) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not serialize the study plan", exception);
    }
  }

  private int countWords(String text) {
    return text.isBlank() ? 0 : text.trim().split("\\s+").length;
  }
}