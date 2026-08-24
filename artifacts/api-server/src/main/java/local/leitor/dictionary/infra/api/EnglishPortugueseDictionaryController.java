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

/**
 * Dedicated contract for the English–Brazilian Portuguese dictionary.
 * Keeping this namespace separate lets the bilingual source be imported and
 * replaced independently from the Wiktionary English reference collection.
 */
@RestController
@RequestMapping("/api/public-dictionary-en-ptbr")
@CrossOrigin
public class EnglishPortugueseDictionaryController {
    private final PublicDictionaryService dictionary;

    public EnglishPortugueseDictionaryController(PublicDictionaryService dictionary) {
        this.dictionary = dictionary;
    }

    @GetMapping
    public List<EntrySummary> search(@RequestParam(defaultValue = "") String query,
                                     @RequestParam(defaultValue = "40") int limit) {
        return dictionary.searchEnglishPortuguese(query, limit);
    }

    @GetMapping("/{entryId}")
    public EntryDetail getEntry(@PathVariable String entryId) {
        return dictionary.getEnglishPortugueseEntry(entryId);
    }
}