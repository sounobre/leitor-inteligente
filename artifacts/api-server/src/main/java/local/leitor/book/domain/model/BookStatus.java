package local.leitor.book.domain.model;

public enum BookStatus {
    READY,
    PROCESSING,
    DRAFT;

    public static BookStatus fromString(String value) {
        if (value == null || value.isBlank()) {
            return READY;
        }
        try {
            return BookStatus.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return READY;
        }
    }
}
