package local.leitor.engine.application.port.out;

import local.leitor.engine.domain.model.StudyPlan;
import local.leitor.book.application.dto.PreparationProgress;
import java.util.function.Consumer;

/**
 * Outbound port for generating structured study plans using language models (Ollama, etc.).
 */
public interface StudyPlanGeneratorPort {
    StudyPlan generatePlan(String endpoint, String model, String content);

    default StudyPlan generatePlan(String provider, String endpoint, String model, String content) {
        return generatePlan(endpoint, model, content);
    }

    default StudyPlan generatePlan(
        String provider,
        String endpoint,
        String model,
        String content,
        Consumer<PreparationProgress> progressListener
    ) {
        return generatePlan(provider, endpoint, model, content);
    }

    default StudyPlan generatePlan(
        String endpoint,
        String model,
        String content,
        Consumer<PreparationProgress> progressListener
    ) {
        return generatePlan(endpoint, model, content);
    }
}
