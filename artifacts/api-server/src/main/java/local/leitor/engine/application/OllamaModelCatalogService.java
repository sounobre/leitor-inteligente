package local.leitor.engine.application;

import java.util.List;
import org.springframework.stereotype.Service;
import local.leitor.engine.application.port.out.OllamaModelCatalogPort;
import local.leitor.engine.domain.model.OllamaModel;

@Service
public class OllamaModelCatalogService {
    private final OllamaModelCatalogPort catalog;

    public OllamaModelCatalogService(OllamaModelCatalogPort catalog) {
        this.catalog = catalog;
    }

    public List<OllamaModel> listModels(String endpoint) {
        return catalog.listModels(endpoint);
    }
}