package local.leitor.dictionary.infra.api;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import local.leitor.dictionary.application.PrivateDictionaryService;
import local.leitor.dictionary.application.PrivateDictionaryService.CardRequest;
import local.leitor.dictionary.application.PrivateDictionaryService.EntryDetail;
import local.leitor.dictionary.application.PrivateDictionaryService.EntrySummary;
import local.leitor.dictionary.application.PrivateDictionaryService.ExampleRequest;
import local.leitor.dictionary.application.PrivateDictionaryService.GeneratedExample;
import local.leitor.dictionary.application.PrivateDictionaryService.ImportRequest;
import local.leitor.dictionary.application.PrivateDictionaryService.ImportResult;
import local.leitor.dictionary.application.PrivateDictionaryService.StudyCard;

@RestController
@RequestMapping("/api/dictionaries")
@CrossOrigin
public class DictionaryController {
    private final PrivateDictionaryService dictionaries;

    public DictionaryController(PrivateDictionaryService dictionaries) {
        this.dictionaries = dictionaries;
    }

    @PostMapping("/import")
    @ResponseStatus(HttpStatus.CREATED)
    public ImportResult importEpub(@RequestBody ImportRequest request) {
        return dictionaries.importEpub(request);
    }

    @GetMapping
    public List<EntrySummary> search(@RequestParam(defaultValue = "") String query) {
        return dictionaries.search(query);
    }

    @GetMapping("/{entryId}")
    public EntryDetail getEntry(@PathVariable String entryId) {
        return dictionaries.getEntry(entryId);
    }

    @PostMapping("/{entryId}/examples")
    @ResponseStatus(HttpStatus.CREATED)
    public GeneratedExample generateExample(@PathVariable String entryId, @RequestBody ExampleRequest request) {
        return dictionaries.generateExample(entryId, request);
    }

    @PostMapping("/{entryId}/cards")
    @ResponseStatus(HttpStatus.CREATED)
    public StudyCard createCard(@PathVariable String entryId, @RequestBody(required = false) CardRequest request) {
        return dictionaries.createStudyCard(entryId, request);
    }
}