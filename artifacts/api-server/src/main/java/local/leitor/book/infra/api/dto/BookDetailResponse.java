package local.leitor.book.infra.api.dto;

import java.util.List;
import local.leitor.book.domain.model.Book;
import local.leitor.engine.domain.model.StudyPlan;

public record BookDetailResponse(
    String id,
    String title,
    String author,
    String sourceType,
    String status,
    String level,
    int progress,
    String coverColor,
    String updatedAt,
    StudyPlan plan,
    List<ChapterResponse> chapters
) {
    public static BookDetailResponse fromDomain(Book book) {
        List<ChapterResponse> chapterResponses = book.getChapters().stream()
            .map(ChapterResponse::fromDomain)
            .toList();

        return new BookDetailResponse(
            book.getId().value(),
            book.getTitle(),
            book.getAuthor(),
            book.getSourceType().name(),
            book.getStatus().name(),
            book.getLevel().name(),
            book.getProgress(),
            book.getCoverColor(),
            book.getUpdatedAt().toString(),
            book.getPlan(),
            chapterResponses
        );
    }
}
