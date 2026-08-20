package local.leitor.book.domain.model;

import java.util.Objects;
import java.util.UUID;
import local.leitor.shared.domain.BusinessValidationException;

/**
 * Value Object representing a unique Book identifier.
 */
public record BookId(String value) {
    public BookId {
        if (value == null || value.isBlank()) {
            throw new BusinessValidationException("Book ID cannot be null or empty");
        }
        value = value.trim();
    }

    public static BookId generate() {
        return new BookId(UUID.randomUUID().toString());
    }

    public static BookId of(String value) {
        return new BookId(value);
    }

    @Override
    public String toString() {
        return value;
    }
}
