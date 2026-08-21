package local.leitor.engine.domain.exception;

import local.leitor.shared.domain.DomainException;

public class OpenRouterRateLimitException extends DomainException {
    public OpenRouterRateLimitException(String message) {
        super(message);
    }
}