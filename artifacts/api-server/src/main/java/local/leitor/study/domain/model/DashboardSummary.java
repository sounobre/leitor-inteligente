package local.leitor.study.domain.model;

import local.leitor.book.domain.model.Book;

/**
 * Value Object representing user's study metrics summary and current book.
 */
public record DashboardSummary(
    int minutesToday,
    int streak,
    int wordsLearned,
    Book currentBook
) {
    public static DashboardSummary of(int minutesToday, int streak, int wordsLearned, Book currentBook) {
        return new DashboardSummary(minutesToday, streak, wordsLearned, currentBook);
    }
}
