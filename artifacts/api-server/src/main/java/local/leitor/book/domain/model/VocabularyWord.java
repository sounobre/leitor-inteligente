package local.leitor.book.domain.model;

import java.util.List;

public record VocabularyWord(
    String term,
    String normalizedTerm,
    int occurrences,
    List<Integer> chapters,
    boolean cardCreated
) {
    public VocabularyWord {
        chapters = chapters == null ? List.of() : List.copyOf(chapters);
    }
}