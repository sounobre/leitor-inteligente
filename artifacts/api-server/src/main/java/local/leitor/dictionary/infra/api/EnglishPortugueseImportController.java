package local.leitor.dictionary.infra.api;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import local.leitor.dictionary.application.EnglishPortugueseDictionaryImporter;

@RestController
@RequestMapping("/api/public-dictionary-en-ptbr")
@CrossOrigin
public class EnglishPortugueseImportController {
    private final EnglishPortugueseDictionaryImporter importer;
    private final AtomicBoolean running = new AtomicBoolean(false);

    public EnglishPortugueseImportController(EnglishPortugueseDictionaryImporter importer) {
        this.importer = importer;
    }

    @PostMapping("/import")
    public ResponseEntity<Map<String, String>> startImport() {
        EnglishPortugueseDictionaryImporter.ImportStatus status = importer.status();
        if ("COMPLETED".equals(status.status()))
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("message", "A importação EN–PT-BR deste release já foi concluída."));
        if (!running.compareAndSet(false, true))
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("message", "A importação EN–PT-BR já está em andamento."));
        CompletableFuture.runAsync(() -> {
            try {
                importer.importDataset(EnglishPortugueseDictionaryImporter.DEFAULT_DATASET_URL,
                    EnglishPortugueseDictionaryImporter.DEFAULT_DATASET_VERSION);
            } finally {
                running.set(false);
            }
        });
        return ResponseEntity.accepted()
            .body(Map.of("message", "A importação EN–PT-BR foi iniciada com checkpoint."));
    }

    @GetMapping("/import/status")
    public Map<String, Object> importStatus() {
        EnglishPortugueseDictionaryImporter.ImportStatus status = importer.status();
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", running.get() ? "RUNNING" : status.status());
        response.put("running", running.get());
        response.put("source", EnglishPortugueseDictionaryImporter.SOURCE_NAME);
        response.put("license", EnglishPortugueseDictionaryImporter.SOURCE_LICENSE);
        response.put("version", status.version());
        response.put("linesProcessed", status.linesProcessed());
        response.put("importedEntries", status.importedEntries());
        response.put("skippedLines", status.skippedLines());
        response.put("checkpointUpdatedAt", status.checkpointUpdatedAt());
        if (status.errorMessage() != null) response.put("errorMessage", status.errorMessage());
        return response;
    }
}