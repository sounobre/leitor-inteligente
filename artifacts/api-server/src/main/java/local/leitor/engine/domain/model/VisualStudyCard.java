package local.leitor.engine.domain.model;

import local.leitor.shared.domain.BusinessValidationException;

/**
 * A spoiler-free visual card. Its example is original and never a book excerpt.
 */
public record VisualStudyCard(
    String term,
    String meaning,
    String example,
    String visualCue,
    String technique,
    String pronunciation,
    String difficulty
) {
    public VisualStudyCard {
        if (term == null || term.isBlank() || meaning == null || meaning.isBlank() || example == null || example.isBlank()) {
            throw new BusinessValidationException("Visual study cards require a term, meaning, and original example");
        }
        term = term.trim();
        meaning = meaning.trim();
        example = example.trim();
        visualCue = visualCue != null ? visualCue.trim() : "";
        technique = technique != null ? technique.trim() : "";
        pronunciation = pronunciation != null ? pronunciation.trim() : "";
        difficulty = difficulty != null && !difficulty.isBlank() ? difficulty.trim() : "B2";
    }
}