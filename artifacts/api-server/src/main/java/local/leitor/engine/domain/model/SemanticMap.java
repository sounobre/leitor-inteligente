package local.leitor.engine.domain.model;

import java.util.Collections;
import java.util.List;

/**
 * Language relationships that are useful before reading without describing plot events.
 */
public record SemanticMap(List<SemanticNode> nodes, List<SemanticConnection> connections) {
    public SemanticMap {
        nodes = nodes != null ? List.copyOf(nodes) : Collections.emptyList();
        connections = connections != null ? List.copyOf(connections) : Collections.emptyList();
    }

    public static SemanticMap empty() {
        return new SemanticMap(Collections.emptyList(), Collections.emptyList());
    }
}