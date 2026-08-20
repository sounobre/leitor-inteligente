package local.leitor.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.net.URLDecoder;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.HashMap;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
@CrossOrigin
public class StudyController {
  private final JdbcTemplate jdbc;
  private final ObjectMapper json;
  private final HttpClient http = HttpClient.newHttpClient();

  private final RowMapper<Book> bookMapper = (rs, rowNum) -> new Book(
      rs.getString("id"), rs.getString("title"), rs.getString("author"),
      rs.getString("source_type"), rs.getString("status"), rs.getString("level"),
      rs.getInt("progress"), rs.getString("cover_color"), rs.getObject("updated_at", OffsetDateTime.class).toString()
  );

  StudyController(JdbcTemplate jdbc, ObjectMapper json) {
    this.jdbc = jdbc;
    this.json = json;
  }

  @GetMapping("/healthz")
  public Map<String, String> health() {
    return Map.of("status", "ok");
  }

  @GetMapping("/books")
  public List<Book> books() {
    return jdbc.query("""
      SELECT id, title, author, source_type, status, level, progress, cover_color, updated_at
      FROM books ORDER BY updated_at DESC
      """, bookMapper);
  }

  @PostMapping("/books")
  @ResponseStatus(HttpStatus.CREATED)
  public Book importBook(@RequestBody BookInput input) throws Exception {
    if (input.title() == null || input.title().isBlank() || input.content() == null || input.content().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title and content are required");
    }
    String id = UUID.randomUUID().toString();
    List<Chapter> chapters = input.sourceType().equals("EPUB")
      ? parseEpub(input.content(), input.fileName())
      : List.of(new Chapter(UUID.randomUUID().toString(), 1, input.title(), input.content(), countWords(input.content())));
    if (chapters.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The EPUB did not contain readable chapters");
    }
    String fullContent = chapters.stream().map(Chapter::content).reduce("", (a, b) -> a.isBlank() ? b : a + "\n\n" + b);
    String plan = json.writeValueAsString(createStudyPlan(input.ollamaEndpoint(), input.ollamaModel(), fullContent));
    jdbc.update("""
      INSERT INTO books (id, title, author, source_type, status, level, progress, cover_color, content, plan)
      VALUES (?, ?, ?, ?, 'READY', 'B2', 0, '#D7F0E5', ?, CAST(? AS jsonb))
      """, id, input.title().trim(), input.author() == null || input.author().isBlank() ? "Autor desconhecido" : input.author().trim(), input.sourceType(), fullContent, plan);
    for (Chapter chapter : chapters) {
      jdbc.update("""
        INSERT INTO book_chapters (id, book_id, position, title, content, word_count)
        VALUES (?, ?, ?, ?, ?, ?)
        """, chapter.id(), id, chapter.position(), chapter.title(), chapter.content(), chapter.wordCount());
    }
    return jdbc.queryForObject("""
      SELECT id, title, author, source_type, status, level, progress, cover_color, updated_at
      FROM books WHERE id = ?
      """, bookMapper, id);
  }

  @GetMapping("/books/{bookId}")
  public Map<String, Object> book(@PathVariable String bookId) throws Exception {
    List<Map<String, Object>> rows = jdbc.queryForList("""
      SELECT id, title, author, source_type, status, level, progress, cover_color, updated_at, plan::text AS plan
      FROM books WHERE id = ?
      """, bookId);
    if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found");
    Map<String, Object> row = rows.getFirst();
    List<Chapter> chapters = jdbc.query("""
      SELECT id, position, title, content, word_count FROM book_chapters
      WHERE book_id = ? ORDER BY position
      """, (rs, index) -> new Chapter(rs.getString("id"), rs.getInt("position"), rs.getString("title"), rs.getString("content"), rs.getInt("word_count")), bookId);
    Map<String, Object> detail = new HashMap<>();
    detail.put("id", row.get("id"));
    detail.put("title", row.get("title"));
    detail.put("author", row.get("author"));
    detail.put("sourceType", row.get("source_type"));
    detail.put("status", row.get("status"));
    detail.put("level", row.get("level"));
    detail.put("progress", row.get("progress"));
    detail.put("coverColor", row.get("cover_color"));
    detail.put("updatedAt", row.get("updated_at").toString());
    detail.put("plan", json.readValue((String) row.get("plan"), new TypeReference<Map<String, Object>>() {}));
    detail.put("chapters", chapters);
    return detail;
  }

  /**
   * Payload used by the offline companion. EPUB content and chapters are
   * intentionally not included: the phone receives only books prepared on
   * the computer and the study plan generated for them.
   */
  @GetMapping("/study/sync")
  public Map<String, Object> syncStudyPlans() throws Exception {
    List<Book> preparedBooks = jdbc.query("""
      SELECT id, title, author, source_type, status, level, progress, cover_color, updated_at
      FROM books WHERE status = 'READY' ORDER BY updated_at DESC
      """, bookMapper);
    List<Map<String, Object>> payload = new ArrayList<>();
    for (Book preparedBook : preparedBooks) {
      Map<String, Object> detail = book(preparedBook.id());
      detail.remove("chapters");
      payload.add(detail);
    }
    return Map.of("books", payload);
  }

  private List<Chapter> parseEpub(String dataUrl, String fileName) {
    try {
      if (fileName != null && !fileName.toLowerCase().endsWith(".epub")) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only .epub files are supported");
      }
      String encoded = dataUrl.contains(",") ? dataUrl.substring(dataUrl.indexOf(',') + 1) : dataUrl;
      byte[] bytes = Base64.getDecoder().decode(encoded);
      if (bytes.length == 0 || bytes.length > 50 * 1024 * 1024) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The EPUB must be smaller than 50 MB");
      }
      java.nio.file.Path temporary = java.nio.file.Files.createTempFile("leitor-", ".epub");
      java.nio.file.Files.write(temporary, bytes);
      try (ZipFile zip = new ZipFile(temporary.toFile())) {
        String rootFile = "OEBPS/content.opf";
        ZipEntry container = zip.getEntry("META-INF/container.xml");
        if (container != null) {
          Document containerDoc = xml(zip.getInputStream(container));
          NodeList roots = containerDoc.getElementsByTagNameNS("*", "rootfile");
          if (roots.getLength() > 0) rootFile = ((Element) roots.item(0)).getAttribute("full-path");
        }
        ZipEntry opf = zip.getEntry(rootFile);
        if (opf == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid EPUB: package document missing");
        Document packageDoc = xml(zip.getInputStream(opf));
        Map<String, String> manifests = new HashMap<>();
        NodeList items = packageDoc.getElementsByTagNameNS("*", "item");
        String basePath = rootFile.contains("/") ? rootFile.substring(0, rootFile.lastIndexOf('/') + 1) : "";
        for (int i = 0; i < items.getLength(); i++) {
          Element item = (Element) items.item(i);
          manifests.put(item.getAttribute("id"), resolvePath(basePath, item.getAttribute("href")));
        }
        Map<String, String> titles = new HashMap<>();
        NodeList metadata = packageDoc.getElementsByTagNameNS("*", "metadata");
        if (metadata.getLength() > 0) {
          NodeList titleNodes = ((Element) metadata.item(0)).getElementsByTagNameNS("*", "title");
          if (titleNodes.getLength() > 0) titles.put("book", titleNodes.item(0).getTextContent().trim());
        }
        List<Chapter> result = new ArrayList<>();
        NodeList spine = packageDoc.getElementsByTagNameNS("*", "itemref");
        for (int i = 0; i < spine.getLength(); i++) {
          String path = manifests.get(((Element) spine.item(i)).getAttribute("idref"));
          if (path == null) continue;
          ZipEntry chapterEntry = zip.getEntry(path);
          if (chapterEntry == null) continue;
          String chapterText = htmlText(new String(zip.getInputStream(chapterEntry).readAllBytes(), StandardCharsets.UTF_8));
          if (!chapterText.isBlank()) result.add(new Chapter(UUID.randomUUID().toString(), result.size() + 1, chapterTitle(chapterText, path), chapterText, countWords(chapterText)));
        }
        return result;
      } finally {
        java.nio.file.Files.deleteIfExists(temporary);
      }
    } catch (ResponseStatusException exception) {
      throw exception;
    } catch (Exception exception) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read this EPUB. Check that it is a valid, unencrypted EPUB.", exception);
    }
  }

  private Document xml(InputStream input) throws Exception {
    var factory = DocumentBuilderFactory.newInstance();
    factory.setNamespaceAware(true);
    factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
    return factory.newDocumentBuilder().parse(input);
  }

  private String resolvePath(String base, String href) {
    return java.nio.file.Paths.get(base, URLDecoder.decode(href.split("#")[0], StandardCharsets.UTF_8))
      .normalize().toString().replace('\\', '/');
  }

  private String htmlText(String html) {
    String withBreaks = html.replaceAll("(?i)<\\s*(br|/p|/div|/h[1-6]|/li|/section|/article)\\s*[^>]*>", "\n");
    String withoutTags = withBreaks.replaceAll("(?s)<[^>]*>", " ");
    return withoutTags.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
      .replaceAll("[ \\t\\x0B\\f\\r]+", " ").replaceAll("\\n\\s*\\n+", "\n\n").trim();
  }

  private String chapterTitle(String text, String path) {
    String first = text.split("\\n", 2)[0].trim();
    return first.length() > 100 ? path.substring(path.lastIndexOf('/') + 1) : first;
  }

  private int countWords(String text) {
    return text.isBlank() ? 0 : text.trim().split("\\s+").length;
  }

  private Map<String, Object> createStudyPlan(String endpoint, String model, String content) throws Exception {
    if (endpoint == null || endpoint.isBlank() || model == null || model.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ollama endpoint and model are required");
    }
    String prompt = """
      Create a language study plan from this text. Return ONLY valid JSON with exactly these arrays:
      vocabulary, idioms, phrasalVerbs. Each array has up to 8 objects with term, meaning (Portuguese),
      example, pronunciation, difficulty (CEFR). Use terms present or strongly implied by the text.
      TEXT:
      """ + content.substring(0, Math.min(content.length(), 24000));
    Map<String, Object> requestBody = Map.of("model", model.trim(), "stream", false, "format", "json", "prompt", prompt);
    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create(endpoint.replaceAll("/+$", "") + "/api/generate"))
      .header("Content-Type", "application/json")
      .timeout(java.time.Duration.ofSeconds(120))
      .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(requestBody)))
      .build();
    final HttpResponse<String> response;
    try {
      response = http.send(request, HttpResponse.BodyHandlers.ofString());
    } catch (Exception exception) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not connect to Ollama at the configured endpoint", exception);
    }
    if (response.statusCode() < 200 || response.statusCode() >= 300) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Ollama returned HTTP " + response.statusCode());
    }
    try {
      var envelope = json.readTree(response.body());
      var plan = json.readTree(envelope.path("response").asText());
      validatePlan(plan);
      return json.convertValue(plan, new TypeReference<Map<String, Object>>() {});
    } catch (ResponseStatusException exception) {
      throw exception;
    } catch (Exception exception) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Ollama returned an invalid study plan", exception);
    }
  }

  private void validatePlan(com.fasterxml.jackson.databind.JsonNode plan) {
    if (!plan.isObject()) throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Ollama plan must be a JSON object");
    for (String category : List.of("vocabulary", "idioms", "phrasalVerbs")) {
      var items = plan.get(category);
      if (items == null || !items.isArray()) throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Ollama plan is missing " + category);
      for (var item : items) {
        for (String field : List.of("term", "meaning", "example", "pronunciation", "difficulty")) {
          if (!item.hasNonNull(field) || item.get(field).asText().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Ollama plan contains an incomplete item");
          }
        }
      }
    }
  }

  @GetMapping("/dashboard")
  public Map<String, Object> dashboard() {
    List<Book> books = books();
    Book current = books.isEmpty() ? new Book(
      "starter", "Wuthering Heights", "Emily Brontë", "EPUB", "READY", "B2", 24, "#D7F0E5", OffsetDateTime.now().toString()
    ) : books.getFirst();
    return Map.of("minutesToday", 18, "streak", 4, "wordsLearned", 47, "currentBook", current);
  }

  private Map<String, Object> starterPlan() {
    return Map.of(
      "vocabulary", List.of(
        item("bewildered", "confuso, perplexo", "She looked bewildered by the question.", "/bɪˈwɪldərd/", "B2"),
        item("reluctant", "relutante, sem vontade", "He was reluctant to leave the room.", "/rɪˈlʌktənt/", "B2")
      ),
      "idioms", List.of(item("break the ice", "quebrar o gelo", "A small joke helped break the ice.", "/breɪk ði aɪs/", "B1")),
      "phrasalVerbs", List.of(item("figure out", "entender, descobrir", "I finally figured out what she meant.", "/ˈfɪɡər aʊt/", "B1"))
    );
  }

  private Map<String, String> item(String term, String meaning, String example, String pronunciation, String difficulty) {
    return Map.of("term", term, "meaning", meaning, "example", example, "pronunciation", pronunciation, "difficulty", difficulty);
  }

  public record Book(String id, String title, String author, String sourceType, String status, String level,
                     int progress, String coverColor, String updatedAt) {}
  public record BookInput(String title, String author, String sourceType, String content, String fileName,
                          String ollamaEndpoint, String ollamaModel) {}
  public record Chapter(String id, int position, String title, String content, int wordCount) {}
}