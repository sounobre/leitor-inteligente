package local.leitor.health.infra.api.dto;

public record HealthResponse(String status) {
    public static HealthResponse ok() {
        return new HealthResponse("ok");
    }
}
