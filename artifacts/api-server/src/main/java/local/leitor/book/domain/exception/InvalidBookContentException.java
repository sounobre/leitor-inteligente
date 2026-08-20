package local.leitor.book.domain.exception;

import local.leitor.shared.domain.DomainException;

public class InvalidBookContentException extends DomainException {
    public InvalidBookContentException(String message) {
        super(message);
    }

    public InvalidBookContentException(String message, Throwable cause) {
        super(message, cause);
    }
}
