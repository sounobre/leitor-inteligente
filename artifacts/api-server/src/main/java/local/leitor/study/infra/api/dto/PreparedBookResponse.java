package local.leitor.study.infra.api.dto;

import local.leitor.book.domain.model.Book;
import local.leitor.engine.domain.model.StudyPlan;

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
    StudyPlan plan
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
            book.getPlan()
        );
    }
}
