package local.leitor.engine.application;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import local.leitor.engine.domain.model.LinguisticDeck;
import local.leitor.engine.domain.model.SemanticConnection;
import local.leitor.engine.domain.model.SemanticMap;
import local.leitor.engine.domain.model.SemanticNode;
import local.leitor.engine.domain.model.StudyItem;
import local.leitor.engine.domain.model.StudyPlan;
import local.leitor.engine.domain.model.VisualStudyCard;

/**
 * Consolida planos de chunks, mantendo conteúdo distinto e removendo apenas duplicatas equivalentes.
 */
public final class StudyPlanAggregator {
    public StudyPlan aggregate(List<StudyPlan> plans) {
        if (plans == null || plans.isEmpty()) {
            return StudyPlan.empty();
        }

        List<StudyItem> vocabulary = distinctItems(plans.stream().flatMap(plan -> plan.vocabulary().stream()).toList());
        List<StudyItem> idioms = distinctItems(plans.stream().flatMap(plan -> plan.idioms().stream()).toList());
        List<StudyItem> phrasalVerbs = distinctItems(plans.stream().flatMap(plan -> plan.phrasalVerbs().stream()).toList());
        List<VisualStudyCard> cards = distinctCards(plans.stream().flatMap(plan -> plan.visualCards().stream()).toList());
        List<LinguisticDeck> decks = mergeDecks(plans.stream().flatMap(plan -> plan.linguisticDecks().stream()).toList());
        SemanticMap semanticMap = mergeMaps(plans.stream().map(StudyPlan::semanticMap).toList());

        return new StudyPlan(vocabulary, idioms, phrasalVerbs, cards, decks, semanticMap);
    }

    private List<StudyItem> distinctItems(List<StudyItem> items) {
        return new ArrayList<>(distinctBy(items, item -> key(
            item.term(), item.meaning(), item.example(), item.pronunciation(), item.difficulty()
        )).values());
    }

    private List<VisualStudyCard> distinctCards(List<VisualStudyCard> cards) {
        return new ArrayList<>(distinctBy(cards, card -> key(
            card.term(), card.meaning(), card.example(), card.visualCue(), card.technique(), card.pronunciation(), card.difficulty()
        )).values());
    }

    private List<LinguisticDeck> mergeDecks(List<LinguisticDeck> decks) {
        Map<String, DeckAccumulator> merged = new LinkedHashMap<>();
        for (LinguisticDeck deck : decks) {
            String deckKey = key(deck.id(), deck.title(), deck.purpose());
            DeckAccumulator accumulator = merged.computeIfAbsent(deckKey, ignored -> new DeckAccumulator(deck));
            accumulator.items.putAll(distinctBy(deck.items(), item -> key(
                item.term(), item.meaning(), item.example(), item.pronunciation(), item.difficulty()
            )));
        }
        return merged.values().stream()
            .map(DeckAccumulator::toDeck)
            .toList();
    }

    private SemanticMap mergeMaps(List<SemanticMap> maps) {
        Map<String, SemanticNode> nodes = new LinkedHashMap<>();
        Map<String, SemanticConnection> connections = new LinkedHashMap<>();
        Set<String> usedNodeIds = new HashSet<>();
        for (SemanticMap map : maps) {
            Map<String, String> remappedIds = new HashMap<>();
            for (SemanticNode node : map.nodes()) {
                String nodeKey = key(node.label());
                SemanticNode existing = nodes.get(nodeKey);
                if (existing == null) {
                    String canonicalId = uniqueNodeId(node.id(), usedNodeIds);
                    existing = new SemanticNode(canonicalId, node.label(), node.description());
                    nodes.put(nodeKey, existing);
                }
                remappedIds.put(node.id(), existing.id());
            }
            for (SemanticConnection connection : map.connections()) {
                String fromId = remappedIds.get(connection.fromId());
                String toId = remappedIds.get(connection.toId());
                if (fromId == null || toId == null) continue;
                SemanticConnection normalized = new SemanticConnection(fromId, toId, connection.relationship());
                connections.putIfAbsent(key(fromId, toId, connection.relationship()), normalized);
            }
        }
        return new SemanticMap(new ArrayList<>(nodes.values()), new ArrayList<>(connections.values()));
    }

    private String uniqueNodeId(String preferredId, Set<String> usedNodeIds) {
        String base = preferredId == null || preferredId.isBlank() ? "concept" : preferredId.trim();
        String candidate = base;
        int suffix = 2;
        while (!usedNodeIds.add(candidate)) {
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }

    private <T> Map<String, T> distinctBy(List<T> values, java.util.function.Function<T, String> keyExtractor) {
        Map<String, T> distinct = new LinkedHashMap<>();
        for (T value : values) distinct.putIfAbsent(keyExtractor.apply(value), value);
        return distinct;
    }

    private String key(String... values) {
        return String.join("\u001F", java.util.Arrays.stream(values)
            .map(value -> value == null ? "" : value.trim().toLowerCase(Locale.ROOT))
            .toList());
    }

    private static final class DeckAccumulator {
        private final LinguisticDeck deck;
        private final Map<String, StudyItem> items = new LinkedHashMap<>();

        private DeckAccumulator(LinguisticDeck deck) {
            this.deck = deck;
        }

        private LinguisticDeck toDeck() {
            return new LinguisticDeck(deck.id(), deck.title(), deck.purpose(), new ArrayList<>(items.values()));
        }
    }
}