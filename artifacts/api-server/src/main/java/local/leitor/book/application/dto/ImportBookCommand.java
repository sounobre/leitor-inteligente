package local.leitor.book.application.dto;

import local.leitor.book.domain.model.SourceType;
import local.leitor.shared.domain.BusinessValidationException;

/**
 * Command DTO for importing books into the system.
 */
public record ImportBookCommand(
    String title,
    String author,
    SourceType sourceType,
    String content,
    String fileName,
    String ollamaEndpoint,
    String ollamaModel,
    String provider
) {
    public ImportBookCommand(
        String title,
        String author,
        SourceType sourceType,
        String content,
        String fileName,
        String ollamaEndpoint,
        String ollamaModel
    ) {
        this(title, author, sourceType, content, fileName, ollamaEndpoint, ollamaModel, "ollama");
    }

    public ImportBookCommand {
        if (title == null || title.isBlank()) {
            throw new BusinessValidationException("Title is required");
        }
        if (content == null || content.isBlank()) {
            throw new BusinessValidationException("Content is required");
        }
        if (sourceType == null) {
            throw new BusinessValidationException("Source type is required");
        }
        if (ollamaEndpoint == null || ollamaEndpoint.isBlank()) {
            throw new BusinessValidationException("AI provider endpoint is required");
        }
        if (ollamaModel == null || ollamaModel.isBlank()) {
            throw new BusinessValidationException("AI provider model is required");
        }
        if (provider == null || provider.isBlank()) {
            throw new BusinessValidationException("AI provider is required");
        }
    }
}
