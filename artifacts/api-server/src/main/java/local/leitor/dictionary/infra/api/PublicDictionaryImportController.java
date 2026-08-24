package local.leitor.dictionary.infra.api;

import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import local.leitor.dictionary.application.PublicDictionaryImporter;

@RestController
@RequestMapping("/api/public-dictionary")
@CrossOrigin
public class PublicDictionaryImportController {
    private final PublicDictionaryImporter importer;
    private final AtomicBoolean running = new AtomicBoolean(false);

    public PublicDictionaryImportController(PublicDictionaryImporter importer) {
        this.importer = importer;
    }

    @PostMapping("/import")
    public ResponseEntity<Map<String, String>> startImport() {
        PublicDictionaryImporter.ImportStatus currentStatus = importer.status();
        if ("COMPLETED".equals(currentStatus.status())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "A importação deste release já foi concluída."));
        }
        if ("RUNNING".equals(currentStatus.status()) && running.get()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "A importação já está em andamento."));
        }
        if (!running.compareAndSet(false, true)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "A importação já está em andamento."));
        }
        CompletableFuture.runAsync(() -> {
            try {
                importer.importDataset(PublicDictionaryImporter.defaultDatasetUrl(), PublicDictionaryImporter.defaultDatasetVersion());
            } finally {
                running.set(false);
            }
        });
        return ResponseEntity.accepted().body(Map.of("message", "A importação do dicionário foi iniciada no banco local."));
    }

    @GetMapping("/import/status")
    public Map<String, Object> importStatus() {
        PublicDictionaryImporter.ImportStatus status = importer.status();
        String state = running.get() ? "RUNNING" : ("RUNNING".equals(status.status()) ? "PAUSED" : status.status());
        Map<String, Object> response = new java.util.LinkedHashMap<>();
        response.put("status", state);
        response.put("running", running.get());
        response.put("version", status.version());
        response.put("linesProcessed", status.linesProcessed());
        response.put("importedEntries", status.importedEntries());
        response.put("totalLines", status.totalLines());
        response.put("skippedLines", status.skippedLines());
        if (status.errorMessage() != null) response.put("errorMessage", status.errorMessage());
        return response;
    }
}