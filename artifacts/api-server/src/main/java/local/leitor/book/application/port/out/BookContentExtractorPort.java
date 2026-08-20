package local.leitor.book.application.port.out;

import java.util.List;
import local.leitor.book.domain.model.Chapter;
import local.leitor.book.domain.model.SourceType;

/**
 * Strategy interface for extracting chapters and contents from different source file types.
 */
public interface BookContentExtractorPort {
    boolean supports(SourceType sourceType);

    List<Chapter> extract(String rawContent, String fileName);
}
