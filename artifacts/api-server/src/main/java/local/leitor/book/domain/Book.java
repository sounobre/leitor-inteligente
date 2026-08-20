package local.leitor.book.domain;

import java.time.OffsetDateTime;

public record Book(
    String id,
    String title,
    String author,
    String sourceType,
    String status,
    String level,
    int progress,
    String coverColor,
    String updatedAt
) {}