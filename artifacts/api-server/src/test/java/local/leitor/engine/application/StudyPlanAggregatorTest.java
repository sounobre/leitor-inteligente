package local.leitor.engine.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import local.leitor.engine.domain.model.LinguisticDeck;
import local.leitor.engine.domain.model.SemanticConnection;
import local.leitor.engine.domain.model.SemanticMap;
import local.leitor.engine.domain.model.SemanticNode;
import local.leitor.engine.domain.model.StudyItem;
import local.leitor.engine.domain.model.StudyPlan;
import local.leitor.engine.domain.model.VisualStudyCard;

class StudyPlanAggregatorTest {
    @Test
    void preservesDistinctMaterialsWhileRemovingEquivalentDuplicates() {
        StudyItem hesitate = item("hesitate");
        StudyItem observe = item("observe");
        VisualStudyCard hesitateCard = card("hesitate");
        VisualStudyCard observeCard = card("observe");

        StudyPlan first = new StudyPlan(
            List.of(hesitate),
            List.of(hesitate),
            List.of(hesitate),
            List.of(hesitateCard),
            List.of(new LinguisticDeck("uncertainty", "Incerteza", "Linguagem de dúvida", List.of(hesitate))),
            new SemanticMap(List.of(new SemanticNode("uncertainty", "uncertainty", "Dúvida")), List.of())
        );
        StudyPlan second = new StudyPlan(
            List.of(hesitate, observe),
            List.of(hesitate, observe),
            List.of(hesitate, observe),
            List.of(hesitateCard, observeCard),
            List.of(new LinguisticDeck("uncertainty", "Incerteza", "Linguagem de dúvida", List.of(hesitate, observe))),
            new SemanticMap(
                List.of(new SemanticNode("uncertainty", "uncertainty", "Outra descrição"), new SemanticNode("observation", "observation", "Atenção")),
                List.of(new SemanticConnection("uncertainty", "observation", "contrasta"))
            )
        );

        StudyPlan merged = new StudyPlanAggregator().aggregate(List.of(first, second));

        assertThat(merged.vocabulary()).hasSize(2);
        assertThat(merged.idioms()).hasSize(2);
        assertThat(merged.phrasalVerbs()).hasSize(2);
        assertThat(merged.visualCards()).hasSize(2);
        assertThat(merged.linguisticDecks()).singleElement().satisfies(deck -> assertThat(deck.items()).hasSize(2));
        assertThat(merged.semanticMap().nodes()).hasSize(2);
        assertThat(merged.semanticMap().connections()).hasSize(1);
    }

    @Test
    void preservesDifferentSemanticNodesWhenChunksReuseShortIds() {
        StudyPlan first = new StudyPlan(
            List.of(), List.of(), List.of(), List.of(), List.of(),
            new SemanticMap(
                List.of(new SemanticNode("n1", "emotion", "Sentimentos e reações.")),
                List.of(new SemanticConnection("n1", "n1", "intensifica"))
            )
        );
        StudyPlan second = new StudyPlan(
            List.of(), List.of(), List.of(), List.of(), List.of(),
            new SemanticMap(
                List.of(new SemanticNode("n1", "description", "Linguagem descritiva.")),
                List.of(new SemanticConnection("n1", "n1", "estrutura"))
            )
        );

        StudyPlan merged = new StudyPlanAggregator().aggregate(List.of(first, second));

        assertThat(merged.semanticMap().nodes()).extracting(SemanticNode::label)
            .containsExactly("emotion", "description");
        assertThat(merged.semanticMap().nodes()).extracting(SemanticNode::id)
            .containsExactly("n1", "n1-2");
        assertThat(merged.semanticMap().connections()).extracting(SemanticConnection::fromId)
            .containsExactly("n1", "n1-2");
    }

    private StudyItem item(String term) {
        return new StudyItem(term, term + " em português", "A neutral sentence uses " + term + ".", "", "B2");
    }

    private VisualStudyCard card(String term) {
        return new VisualStudyCard(term, term + " em português", "A neutral sentence uses " + term + ".", "Um símbolo", "Técnica", "", "B2");
    }
}