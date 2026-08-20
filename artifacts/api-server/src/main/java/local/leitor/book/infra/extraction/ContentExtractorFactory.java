package local.leitor.book.infra.extraction;

import java.util.List;
import org.springframework.stereotype.Component;
import local.leitor.book.application.port.out.BookContentExtractorPort;
import local.leitor.book.domain.model.SourceType;
import local.leitor.shared.domain.BusinessValidationException;

/**
 * Strategy selector factory for BookContentExtractorPort implementations (Open/Closed Principle).
 */
@Component
public class ContentExtractorFactory {
    private final List<BookContentExtractorPort> extractors;

    public ContentExtractorFactory(List<BookContentExtractorPort> extractors) {
        this.extractors = extractors;
    }

    public BookContentExtractorPort getExtractor(SourceType sourceType) {
        return extractors.stream()
            .filter(extractor -> extractor.supports(sourceType))
            .findFirst()
            .orElseThrow(() -> new BusinessValidationException("No extractor available for source type: " + sourceType));
    }
}
