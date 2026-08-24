package local.leitor.dictionary.infra.persistence;

import java.net.URI;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import local.leitor.dictionary.application.PublicDictionaryImporter;

@Component
@ConditionalOnProperty(name = "dictionary.import.enabled", havingValue = "true")
public class PublicDictionaryImportRunner implements ApplicationRunner {
    private static final String DEFAULT_URL = "https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl.gz";
    private final PublicDictionaryImporter importer;

    public PublicDictionaryImportRunner(PublicDictionaryImporter importer) {
        this.importer = importer;
    }

    @Override
    public void run(ApplicationArguments arguments) {
        String rawUrl = arguments.getOptionValues("dictionary.import.url") == null
            ? DEFAULT_URL : arguments.getOptionValues("dictionary.import.url").getFirst();
        String version = arguments.getOptionValues("dictionary.import.version") == null
            ? "kaikki-english-2026-08-20" : arguments.getOptionValues("dictionary.import.version").getFirst();
        importer.importDataset(URI.create(rawUrl), version);
    }
}