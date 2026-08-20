package local.leitor.book.domain.model;

import java.util.UUID;
import local.leitor.shared.domain.BusinessValidationException;

/**
 * Domain entity representing a chapter or section within a book.
 */
public record Chapter(
    String id,
    int position,
    String title,
    String content,
    int wordCount
) {
    public Chapter {
        if (id == null || id.isBlank()) {
            id = UUID.randomUUID().toString();
        }
        if (position < 1) {
            throw new BusinessValidationException("Chapter position must be 1 or greater");
        }
        if (title == null || title.isBlank()) {
            title = "Chapter " + position;
        }
        if (content == null) {
            content = "";
        }
        if (wordCount <= 0 && !content.isBlank()) {
            wordCount = calculateWordCount(content);
        }
    }

    public static Chapter of(int position, String title, String content) {
        return new Chapter(UUID.randomUUID().toString(), position, title, content, calculateWordCount(content));
    }

    public static Chapter of(String id, int position, String title, String content, int wordCount) {
        return new Chapter(id, position, title, content, wordCount);
    }

    public static int calculateWordCount(String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }
        return text.trim().split("\\s+").length;
    }
}
