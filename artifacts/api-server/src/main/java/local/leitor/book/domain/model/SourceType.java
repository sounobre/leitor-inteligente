package local.leitor.book.domain.model;

import local.leitor.shared.domain.BusinessValidationException;

/**
 * Supported book/document source formats.
 */
public enum SourceType {
    EPUB,
    ARTICLE;

    public static SourceType fromString(String value) {
        if (value == null || value.isBlank()) {
            throw new BusinessValidationException("Source type is required");
        }
        try {
            return SourceType.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BusinessValidationException("Unsupported source type: " + value);
        }
    }
}
