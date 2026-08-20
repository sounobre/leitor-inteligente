package local.leitor.book.domain;

public record Chapter(
    String id,
    int position,
    String title,
    String content,
    int wordCount
) {}