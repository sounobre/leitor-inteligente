package local.leitor.engine.domain.model;

import java.util.Collections;
import java.util.List;

/**
 * A small collection of language items grouped by a reader-facing learning goal.
 */
public record LinguisticDeck(
    String id,
    String title,
    String purpose,
    List<StudyItem> items
) {
    public LinguisticDeck {
        id = id != null ? id.trim() : "";
        title = title != null ? title.trim() : "";
        purpose = purpose != null ? purpose.trim() : "";
        items = items != null ? List.copyOf(items) : Collections.emptyList();
    }
}