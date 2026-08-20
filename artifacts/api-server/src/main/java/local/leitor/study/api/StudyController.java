package local.leitor.study.api;

import java.util.Map;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import local.leitor.study.application.StudyDashboardService;
import local.leitor.study.application.StudySyncService;

@RestController
@RequestMapping("/api")
@CrossOrigin
public class StudyController {
  private final StudyDashboardService dashboardService;
  private final StudySyncService syncService;

  public StudyController(StudyDashboardService dashboardService, StudySyncService syncService) {
    this.dashboardService = dashboardService;
    this.syncService = syncService;
  }

  @GetMapping("/dashboard")
  public Map<String, Object> dashboard() {
    return dashboardService.dashboard();
  }

  /**
   * The phone receives prepared study plans only; original EPUB content and
   * chapters remain on the computer.
   */
  @GetMapping("/study/sync")
  public Map<String, Object> syncStudyPlans() {
    return syncService.syncPreparedPlans();
  }
}