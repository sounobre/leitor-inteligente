package local.leitor.engine.application.port.out;

import local.leitor.engine.domain.model.StudyPlan;

/**
 * Outbound port for generating structured study plans using language models (Ollama, etc.).
 */
public interface StudyPlanGeneratorPort {
    StudyPlan generatePlan(String endpoint, String model, String content);
}
