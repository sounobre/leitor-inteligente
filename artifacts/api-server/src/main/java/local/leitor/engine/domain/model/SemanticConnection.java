package local.leitor.engine.domain.model;

public record SemanticConnection(String fromId, String toId, String relationship) {
    public SemanticConnection {
        fromId = fromId != null ? fromId.trim() : "";
        toId = toId != null ? toId.trim() : "";
        relationship = relationship != null ? relationship.trim() : "";
    }
}