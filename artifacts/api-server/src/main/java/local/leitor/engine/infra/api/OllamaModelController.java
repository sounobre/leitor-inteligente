package local.leitor.engine.infra.api;

import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import local.leitor.engine.application.OllamaModelCatalogService;

@RestController
@RequestMapping("/api/ollama")
@CrossOrigin
public class OllamaModelController {
    private final OllamaModelCatalogService catalogService;

    public OllamaModelController(OllamaModelCatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/models")
    public Map<String, Object> listModels(@RequestParam String endpoint) {
        return Map.of("models", catalogService.listModels(endpoint));
    }
}