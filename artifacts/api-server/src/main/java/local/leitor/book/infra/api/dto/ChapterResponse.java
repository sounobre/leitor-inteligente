package local.leitor.book.infra.api.dto;

import local.leitor.book.domain.model.Chapter;

public record ChapterResponse(
    String id,
    int position,
    String title,
    String content,
    int wordCount
) {
    public static ChapterResponse fromDomain(Chapter chapter) {
        return new ChapterResponse(
            chapter.id(),
            chapter.position(),
            chapter.title(),
            chapter.content(),
            chapter.wordCount()
        );
    }
}
