package local.leitor.engine.application;

import java.util.List;
import org.springframework.stereotype.Service;
import local.leitor.engine.application.port.out.OpenRouterModelCatalogPort;
import local.leitor.engine.domain.model.OllamaModel;

@Service
public class OpenRouterModelCatalogService {
    private final OpenRouterModelCatalogPort catalog;

    public OpenRouterModelCatalogService(OpenRouterModelCatalogPort catalog) {
        this.catalog = catalog;
    }

    public List<OllamaModel> listModels(String endpoint) {
        return catalog.listOpenRouterModels(endpoint);
    }
}