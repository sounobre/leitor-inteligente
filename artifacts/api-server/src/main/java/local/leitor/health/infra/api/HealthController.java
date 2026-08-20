package local.leitor.health.infra.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import local.leitor.health.infra.api.dto.HealthResponse;

@RestController
public class HealthController {
    @GetMapping("/api/healthz")
    public HealthResponse health() {
        return HealthResponse.ok();
    }
}
