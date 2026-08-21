package local.leitor.book.infra.api.dto;

import local.leitor.book.application.dto.ImportBookCommand;
import local.leitor.book.domain.model.SourceType;

public record BookInputRequest(
    String title,
    String author,
    String sourceType,
    String content,
    String fileName,
    String ollamaEndpoint,
    String ollamaModel,
    String provider
) {
    public ImportBookCommand toCommand() {
        return new ImportBookCommand(
            title,
            author,
            SourceType.fromString(sourceType),
            content,
            fileName,
            ollamaEndpoint,
            ollamaModel,
            provider
        );
    }
}
