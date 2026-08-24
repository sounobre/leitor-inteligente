package local.leitor.study.infra.api.dto;

import local.leitor.book.domain.model.Book;
import local.leitor.engine.domain.model.StudyPlan;
import local.leitor.book.infra.api.dto.ChapterResponse;
import java.util.List;

public record PreparedBookResponse(
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
    int readingChapter,
    int readingOffset,
    List<ChapterResponse> chapters
) {
    public static PreparedBookResponse fromDomain(Book book) {
        return new PreparedBookResponse(
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
            book.getReadingChapter(),
            book.getReadingOffset(),
            book.getChapters().stream().map(ChapterResponse::fromDomain).toList()
        );
    }
}
