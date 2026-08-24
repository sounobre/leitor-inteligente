package local.leitor.dictionary.infra.persistence;

import java.net.URI;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import local.leitor.dictionary.application.EnglishPortugueseDictionaryImporter;

@Component
@ConditionalOnProperty(name = "dictionary.import.en-ptbr.enabled", havingValue = "true")
public class EnglishPortugueseImportRunner implements ApplicationRunner {
    private final EnglishPortugueseDictionaryImporter importer;

    public EnglishPortugueseImportRunner(EnglishPortugueseDictionaryImporter importer) {
        this.importer = importer;
    }

    @Override
    public void run(ApplicationArguments arguments) {
        String rawUrl = option(arguments, "dictionary.import.en-ptbr.url",
            EnglishPortugueseDictionaryImporter.DEFAULT_DATASET_URL.toString());
        String version = option(arguments, "dictionary.import.en-ptbr.version",
            EnglishPortugueseDictionaryImporter.DEFAULT_DATASET_VERSION);
        importer.importDataset(URI.create(rawUrl), version);
    }

    private static String option(ApplicationArguments arguments, String name, String fallback) {
        return arguments.getOptionValues(name) == null
            ? fallback : arguments.getOptionValues(name).getFirst();
    }
}