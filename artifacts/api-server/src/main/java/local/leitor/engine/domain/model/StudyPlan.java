package local.leitor.engine.domain.model;

import java.util.Collections;
import java.util.List;

/**
 * Value Object / Aggregate representing a complete structured language study plan.
 */
public record StudyPlan(
    List<StudyItem> vocabulary,
    List<StudyItem> idioms,
    List<StudyItem> phrasalVerbs
) {
    public StudyPlan {
        vocabulary = vocabulary != null ? List.copyOf(vocabulary) : Collections.emptyList();
        idioms = idioms != null ? List.copyOf(idioms) : Collections.emptyList();
        phrasalVerbs = phrasalVerbs != null ? List.copyOf(phrasalVerbs) : Collections.emptyList();
    }

    public static StudyPlan empty() {
        return new StudyPlan(Collections.emptyList(), Collections.emptyList(), Collections.emptyList());
    }

    public int totalItems() {
        return vocabulary.size() + idioms.size() + phrasalVerbs.size();
    }
}
