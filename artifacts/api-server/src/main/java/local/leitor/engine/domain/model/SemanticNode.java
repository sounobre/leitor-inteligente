package local.leitor.engine.domain.model;

public record SemanticNode(String id, String label, String description) {
    public SemanticNode {
        id = id != null ? id.trim() : "";
        label = label != null ? label.trim() : "";
        description = description != null ? description.trim() : "";
    }
}