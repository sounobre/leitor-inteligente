package local.leitor.book.infra.api.dto;

import java.util.List;

public record VocabularyCardsRequest(List<String> normalizedTerms) {}