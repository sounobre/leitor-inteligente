package local.leitor.study.infra.api;

import java.util.List;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import local.leitor.study.application.port.in.GetDashboardUseCase;
import local.leitor.study.application.port.in.SyncStudyPlansUseCase;
import local.leitor.study.domain.model.DashboardSummary;
import local.leitor.study.infra.api.dto.DashboardResponse;
import local.leitor.study.infra.api.dto.PreparedBookResponse;
import local.leitor.study.infra.api.dto.StudySyncResponse;

@RestController
@RequestMapping("/api")
@CrossOrigin
public class StudyController {
    private final GetDashboardUseCase getDashboardUseCase;
    private final SyncStudyPlansUseCase syncStudyPlansUseCase;

    public StudyController(
        GetDashboardUseCase getDashboardUseCase,
        SyncStudyPlansUseCase syncStudyPlansUseCase
    ) {
        this.getDashboardUseCase = getDashboardUseCase;
        this.syncStudyPlansUseCase = syncStudyPlansUseCase;
    }

    @GetMapping("/dashboard")
    public DashboardResponse dashboard() {
        DashboardSummary summary = getDashboardUseCase.getDashboard();
        return DashboardResponse.fromDomain(summary);
    }

    @GetMapping("/study/sync")
    public StudySyncResponse syncStudyPlans() {
        List<PreparedBookResponse> books = syncStudyPlansUseCase.getPreparedBooksForSync().stream()
            .map(PreparedBookResponse::fromDomain)
            .toList();
        return StudySyncResponse.of(books);
    }
}
