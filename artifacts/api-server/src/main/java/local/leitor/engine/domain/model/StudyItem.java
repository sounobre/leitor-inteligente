package local.leitor.engine.domain.model;

import local.leitor.shared.domain.BusinessValidationException;

/**
 * Value Object representing an individual vocabulary, idiom, or phrasal verb study item.
 */
public record StudyItem(
    String term,
    String meaning,
    String example,
    String pronunciation,
    String difficulty
) {
    public StudyItem {
        if (term == null || term.isBlank()) {
            throw new BusinessValidationException("Study item term cannot be blank");
        }
        if (meaning == null || meaning.isBlank()) {
            throw new BusinessValidationException("Study item meaning cannot be blank");
        }
        term = term.trim();
        meaning = meaning.trim();
        example = example != null ? example.trim() : "";
        pronunciation = pronunciation != null ? pronunciation.trim() : "";
        difficulty = difficulty != null ? difficulty.trim() : "B2";
    }

    public static StudyItem of(String term, String meaning, String example, String pronunciation, String difficulty) {
        return new StudyItem(term, meaning, example, pronunciation, difficulty);
    }
}
