package local.leitor.study.infra.api.dto;

import local.leitor.book.infra.api.dto.BookResponse;
import local.leitor.study.domain.model.DashboardSummary;

public record DashboardResponse(
    int minutesToday,
    int streak,
    int wordsLearned,
    BookResponse currentBook
) {
    public static DashboardResponse fromDomain(DashboardSummary summary) {
        return new DashboardResponse(
            summary.minutesToday(),
            summary.streak(),
            summary.wordsLearned(),
            BookResponse.fromDomain(summary.currentBook())
        );
    }
}
