package local.leitor.book.domain.model;

/**
 * Common European Framework of Reference for Languages (CEFR) difficulty level.
 */
public enum CefrLevel {
    A1,
    A2,
    B1,
    B2,
    C1,
    C2;

    public static CefrLevel fromString(String value) {
        if (value == null || value.isBlank()) {
            return B2;
        }
        try {
            return CefrLevel.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return B2;
        }
    }
}
