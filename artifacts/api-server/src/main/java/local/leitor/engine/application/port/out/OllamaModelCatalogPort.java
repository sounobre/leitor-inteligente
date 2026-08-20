package local.leitor.engine.application.port.out;

import java.util.List;
import local.leitor.engine.domain.model.OllamaModel;

public interface OllamaModelCatalogPort {
    List<OllamaModel> listModels(String endpoint);
}