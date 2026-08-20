package local.leitor.engine.domain.model;

import java.util.Collections;
import java.util.List;

/**
 * Value Object / Aggregate representing a complete structured language study plan.
 */
public record StudyPlan(
    List<StudyItem> vocabulary,
    List<StudyItem> idioms,
    List<StudyItem> phrasalVerbs,
    List<VisualStudyCard> visualCards,
    List<LinguisticDeck> linguisticDecks,
    SemanticMap semanticMap
) {
    public StudyPlan {
        vocabulary = vocabulary != null ? List.copyOf(vocabulary) : Collections.emptyList();
        idioms = idioms != null ? List.copyOf(idioms) : Collections.emptyList();
        phrasalVerbs = phrasalVerbs != null ? List.copyOf(phrasalVerbs) : Collections.emptyList();
        visualCards = visualCards != null ? List.copyOf(visualCards) : Collections.emptyList();
        linguisticDecks = linguisticDecks != null ? List.copyOf(linguisticDecks) : Collections.emptyList();
        semanticMap = semanticMap != null ? semanticMap : SemanticMap.empty();
    }

    public StudyPlan(List<StudyItem> vocabulary, List<StudyItem> idioms, List<StudyItem> phrasalVerbs) {
        this(vocabulary, idioms, phrasalVerbs, Collections.emptyList(), Collections.emptyList(), SemanticMap.empty());
    }

    public static StudyPlan empty() {
        return new StudyPlan(
            Collections.emptyList(),
            Collections.emptyList(),
            Collections.emptyList(),
            Collections.emptyList(),
            Collections.emptyList(),
            SemanticMap.empty()
        );
    }

    public int totalItems() {
        return vocabulary.size() + idioms.size() + phrasalVerbs.size() + visualCards.size();
    }
}
