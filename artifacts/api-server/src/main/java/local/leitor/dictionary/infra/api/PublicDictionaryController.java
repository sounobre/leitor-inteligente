package local.leitor.dictionary.infra.api;

import java.util.List;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import local.leitor.dictionary.application.PublicDictionaryService;
import local.leitor.dictionary.application.PublicDictionaryService.EntryDetail;
import local.leitor.dictionary.application.PublicDictionaryService.EntrySummary;

@RestController
@RequestMapping("/api/public-dictionary")
@CrossOrigin
public class PublicDictionaryController {
    private final PublicDictionaryService dictionary;

    public PublicDictionaryController(PublicDictionaryService dictionary) {
        this.dictionary = dictionary;
    }

    @GetMapping
    public List<EntrySummary> search(@RequestParam(defaultValue = "") String query,
                                     @RequestParam(defaultValue = "40") int limit) {
        return dictionary.search(query, limit);
    }

    @GetMapping("/{entryId}")
    public EntryDetail getEntry(@PathVariable String entryId) {
        return dictionary.getEntry(entryId);
    }
}