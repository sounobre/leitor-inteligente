package local.leitor.book.infra.api.dto;

public record ReadingPositionRequest(int chapter, int offset, int progress, String clientUpdatedAt) {}