package local.leitor.book.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import local.leitor.book.domain.model.Book;
import local.leitor.book.domain.model.BookStatus;
import local.leitor.book.domain.model.CefrLevel;
import local.leitor.book.domain.model.Chapter;
import local.leitor.book.domain.model.SourceType;
import local.leitor.engine.domain.model.StudyItem;
import local.leitor.engine.domain.model.StudyPlan;
import local.leitor.shared.domain.BusinessValidationException;

class BookTest {

    @Test
    @DisplayName("Should create a valid book aggregate with defaults and calculate word count")
    void shouldCreateValidBookAggregate() {
        Chapter chapter1 = Chapter.of(1, "Chapter 1", "The quick brown fox jumps over the lazy dog");
        Chapter chapter2 = Chapter.of(2, "Chapter 2", "Another sentence with five words");

        StudyPlan plan = new StudyPlan(
            List.of(StudyItem.of("fox", "raposa", "The fox ran", "/fɒks/", "A2")),
            List.of(),
            List.of()
        );

        Book book = Book.create(
            "Sample Title",
            "Sample Author",
            SourceType.EPUB,
            "Full Content",
            List.of(chapter1, chapter2),
            plan
        );

        assertThat(book.getId()).isNotNull();
        assertThat(book.getTitle()).isEqualTo("Sample Title");
        assertThat(book.getAuthor()).isEqualTo("Sample Author");
        assertThat(book.getSourceType()).isEqualTo(SourceType.EPUB);
        assertThat(book.getStatus()).isEqualTo(BookStatus.READY);
        assertThat(book.getLevel()).isEqualTo(CefrLevel.B2);
        assertThat(book.getProgress()).isEqualTo(0);
        assertThat(book.getChapters()).hasSize(2);
        assertThat(book.calculateTotalWords()).isEqualTo(14); // 9 + 5
        assertThat(book.getPlan().vocabulary()).hasSize(1);
    }

    @Test
    @DisplayName("Should throw BusinessValidationException when title is blank")
    void shouldThrowExceptionWhenTitleIsBlank() {
        assertThatThrownBy(() -> Book.create(
            "   ",
            "Author",
            SourceType.EPUB,
            "Content",
            List.of(),
            StudyPlan.empty()
        )).isInstanceOf(BusinessValidationException.class)
          .hasMessageContaining("title cannot be blank");
    }

    @Test
    @DisplayName("Should update reading progress and validate range 0-100")
    void shouldUpdateReadingProgressCorrectly() {
        Book book = Book.create(
            "Title",
            "Author",
            SourceType.EPUB,
            "Content",
            List.of(),
            StudyPlan.empty()
        );

        book.updateProgress(50);
        assertThat(book.getProgress()).isEqualTo(50);

        assertThatThrownBy(() -> book.updateProgress(105))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("between 0 and 100");
    }
}
