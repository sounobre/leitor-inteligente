package local.leitor.engine.domain.exception;

import local.leitor.shared.domain.DomainException;

public class OpenRouterPaymentRequiredException extends DomainException {
    public OpenRouterPaymentRequiredException(String message) {
        super(message);
    }
}