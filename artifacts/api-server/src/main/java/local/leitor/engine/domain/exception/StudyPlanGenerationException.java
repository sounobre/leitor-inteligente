package local.leitor.engine.domain.exception;

import local.leitor.shared.domain.DomainException;

public class StudyPlanGenerationException extends DomainException {
    public StudyPlanGenerationException(String message) {
        super(message);
    }

    public StudyPlanGenerationException(String message, Throwable cause) {
        super(message, cause);
    }
}
