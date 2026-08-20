package local.leitor.book.api;

public record BookInput(
    String title,
    String author,
    String sourceType,
    String content,
    String fileName,
    String ollamaEndpoint,
    String ollamaModel
) {}