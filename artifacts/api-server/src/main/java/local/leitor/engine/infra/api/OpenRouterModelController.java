package local.leitor.engine.infra.api;

import java.util.Map;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import local.leitor.engine.application.OpenRouterModelCatalogService;

@RestController
@RequestMapping("/api/openrouter")
@CrossOrigin
public class OpenRouterModelController {
    private final OpenRouterModelCatalogService catalogService;

    public OpenRouterModelController(OpenRouterModelCatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/models")
    public Map<String, Object> listModels(@RequestParam(required = false) String endpoint) {
        return Map.of("models", catalogService.listModels(endpoint));
    }
}