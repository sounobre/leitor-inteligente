package local.leitor.book.infra.extraction;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;
import local.leitor.book.application.port.out.BookContentExtractorPort;
import local.leitor.book.domain.model.Chapter;
import local.leitor.book.domain.model.SourceType;
import local.leitor.shared.domain.BusinessValidationException;

@Component
public class ArticleContentExtractor implements BookContentExtractorPort {
    @Override
    public boolean supports(SourceType sourceType) {
        return sourceType == SourceType.ARTICLE;
    }

    @Override
    public List<Chapter> extract(String rawContent, String fileName) {
        if (rawContent == null || rawContent.isBlank()) {
            throw new BusinessValidationException("Article content cannot be blank");
        }

        String title = fileName != null && !fileName.isBlank() ? fileName.trim() : "Article";
        Chapter chapter = new Chapter(
            UUID.randomUUID().toString(),
            1,
            title,
            rawContent.trim(),
            Chapter.calculateWordCount(rawContent)
        );

        return List.of(chapter);
    }
}
