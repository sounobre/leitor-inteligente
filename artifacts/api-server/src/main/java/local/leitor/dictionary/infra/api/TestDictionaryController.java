package local.leitor.dictionary.infra.api;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import local.leitor.dictionary.application.TestDictionaryService;
import local.leitor.dictionary.application.TestDictionaryService.EntryDetail;
import local.leitor.dictionary.application.TestDictionaryService.EntrySummary;
import local.leitor.dictionary.application.TestDictionaryService.ExampleRequest;
import local.leitor.dictionary.application.TestDictionaryService.GeneratedExample;
import local.leitor.dictionary.application.TestDictionaryService.StudyCard;

@RestController
@RequestMapping("/api/test-dictionary")
@CrossOrigin
public class TestDictionaryController {
    private final TestDictionaryService dictionary;
    public TestDictionaryController(TestDictionaryService dictionary) { this.dictionary = dictionary; }

    @GetMapping public List<EntrySummary> search(@RequestParam(defaultValue = "") String query) { return dictionary.search(query); }
    @GetMapping("/sync") public List<EntryDetail> sync() { return dictionary.sync(); }
    @GetMapping("/{entryId}") public EntryDetail getEntry(@PathVariable String entryId) { return dictionary.getEntry(entryId); }
    @PostMapping("/{entryId}/examples")
    @ResponseStatus(HttpStatus.CREATED)
    public GeneratedExample saveExample(@PathVariable String entryId, @RequestBody ExampleRequest request) {
        return dictionary.saveExample(entryId, request);
    }
    @PostMapping("/{entryId}/cards")
    @ResponseStatus(HttpStatus.CREATED)
    public StudyCard createCard(@PathVariable String entryId, @RequestBody(required = false) CardRequest request) {
        return dictionary.createCard(entryId, request == null ? null : request.exampleId());
    }
    public record CardRequest(String exampleId) {}
}