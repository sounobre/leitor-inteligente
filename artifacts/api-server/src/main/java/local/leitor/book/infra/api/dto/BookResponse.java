package local.leitor.book.infra.api.dto;

import local.leitor.book.domain.model.Book;

public record BookResponse(
    String id,
    String title,
    String author,
    String sourceType,
    String status,
    String level,
    int progress,
    int readingChapter,
    int readingOffset,
    String coverColor,
    String updatedAt
) {
    public static BookResponse fromDomain(Book book) {
        return new BookResponse(
            book.getId().value(),
            book.getTitle(),
            book.getAuthor(),
            book.getSourceType().name(),
            book.getStatus().name(),
            book.getLevel().name(),
            book.getProgress(), book.getReadingChapter(), book.getReadingOffset(),
            book.getCoverColor(),
            book.getUpdatedAt().toString()
        );
    }
}
