package local.leitor.book.application.dto;

/**
 * Safe progress information exposed while a book is being prepared.
 * It deliberately contains no book content, provider credentials, or provider response.
 */
public record PreparationProgress(
    String stage,
    int completedChunks,
    int totalChunks,
    String activity
) {
    public static PreparationProgress extracting() {
        return new PreparationProgress("extracting", 0, 0, "");
    }

    public static PreparationProgress preparing(int completedChunks, int totalChunks) {
        return preparing(completedChunks, totalChunks, "");
    }

    public static PreparationProgress preparing(int completedChunks, int totalChunks, String activity) {
        return new PreparationProgress("preparing", completedChunks, totalChunks, activity == null ? "" : activity);
    }

    public static PreparationProgress completed(int totalChunks) {
        return new PreparationProgress("completed", totalChunks, totalChunks, "");
    }
}