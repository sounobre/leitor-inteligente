package local.leitor.book.domain.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import local.leitor.engine.domain.model.StudyPlan;
import local.leitor.shared.domain.BusinessValidationException;

/**
 * Aggregate Root representing a Book / Study Document in the library.
 */
public class Book {
    private static final String DEFAULT_COVER_COLOR = "#D7F0E5";
    private static final String DEFAULT_AUTHOR = "Autor desconhecido";

    private final BookId id;
    private String title;
    private String author;
    private final SourceType sourceType;
    private BookStatus status;
    private CefrLevel level;
    private int progress;
    private int readingChapter;
    private int readingOffset;
    private String coverColor;
    private String content;
    private StudyPlan plan;
    private final List<Chapter> chapters;
    private Instant updatedAt;

    private Book(
        BookId id,
        String title,
        String author,
        SourceType sourceType,
        BookStatus status,
        CefrLevel level,
        int progress,
        String coverColor,
        String content,
        StudyPlan plan,
        List<Chapter> chapters,
        Instant updatedAt
    ) {
        this.id = Objects.requireNonNull(id, "Book id cannot be null");
        this.title = validateTitle(title);
        this.author = author == null || author.isBlank() ? DEFAULT_AUTHOR : author.trim();
        this.sourceType = Objects.requireNonNull(sourceType, "SourceType cannot be null");
        this.status = status != null ? status : BookStatus.READY;
        this.level = level != null ? level : CefrLevel.B2;
        this.progress = validateProgress(progress);
        this.readingChapter = 1;
        this.readingOffset = 0;
        this.coverColor = coverColor == null || coverColor.isBlank() ? DEFAULT_COVER_COLOR : coverColor.trim();
        this.content = content != null ? content : "";
        this.plan = plan != null ? plan : StudyPlan.empty();
        this.chapters = chapters != null ? new ArrayList<>(chapters) : new ArrayList<>();
        this.updatedAt = updatedAt != null ? updatedAt : Instant.now();
    }

    /**
     * Factory method for creating a brand new book aggregate upon import.
     */
    public static Book create(
        String title,
        String author,
        SourceType sourceType,
        String content,
        List<Chapter> chapters,
        StudyPlan plan
    ) {
        BookId generatedId = BookId.generate();
        return new Book(
            generatedId,
            title,
            author,
            sourceType,
            BookStatus.READY,
            CefrLevel.B2,
            0,
            DEFAULT_COVER_COLOR,
            content,
            plan,
            chapters,
            Instant.now()
        );
    }

    /**
     * Reconstitutes an existing aggregate from persistence layer.
     */
    public static Book reconstitute(
        BookId id,
        String title,
        String author,
        SourceType sourceType,
        BookStatus status,
        CefrLevel level,
        int progress,
        String coverColor,
        String content,
        StudyPlan plan,
        List<Chapter> chapters,
        Instant updatedAt
    ) {
        return new Book(
            id,
            title,
            author,
            sourceType,
            status,
            level,
            progress,
            coverColor,
            content,
            plan,
            chapters,
            updatedAt
        );
    }

    public static Book reconstitute(
        BookId id, String title, String author, SourceType sourceType, BookStatus status,
        CefrLevel level, int progress, int readingChapter, int readingOffset,
        String coverColor, String content, StudyPlan plan, List<Chapter> chapters, Instant updatedAt
    ) {
        Book book = reconstitute(id, title, author, sourceType, status, level, progress, coverColor, content, plan, chapters, updatedAt);
        book.readingChapter = Math.max(1, readingChapter);
        book.readingOffset = Math.max(0, readingOffset);
        return book;
    }

    public void updateProgress(int newProgress) {
        this.progress = validateProgress(newProgress);
        this.updatedAt = Instant.now();
    }

    public void updateReadingPosition(int chapter, int offset, int newProgress) {
        if (chapter < 1) throw new BusinessValidationException("Reading chapter must be 1 or greater");
        if (offset < 0) throw new BusinessValidationException("Reading offset cannot be negative");
        this.readingChapter = chapter;
        this.readingOffset = offset;
        this.progress = validateProgress(newProgress);
        this.updatedAt = Instant.now();
    }

    public void assignStudyPlan(StudyPlan newPlan) {
        this.plan = Objects.requireNonNull(newPlan, "StudyPlan cannot be null");
        this.status = BookStatus.READY;
        this.updatedAt = Instant.now();
    }

    public int calculateTotalWords() {
        if (!chapters.isEmpty()) {
            return chapters.stream().mapToInt(Chapter::wordCount).sum();
        }
        return Chapter.calculateWordCount(content);
    }

    private static String validateTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new BusinessValidationException("Book title cannot be blank");
        }
        return title.trim();
    }

    private static int validateProgress(int progress) {
        if (progress < 0 || progress > 100) {
            throw new BusinessValidationException("Progress must be between 0 and 100 percent");
        }
        return progress;
    }

    // Getters
    public BookId getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getAuthor() {
        return author;
    }

    public SourceType getSourceType() {
        return sourceType;
    }

    public BookStatus getStatus() {
        return status;
    }

    public CefrLevel getLevel() {
        return level;
    }

    public int getProgress() {
        return progress;
    }

    public int getReadingChapter() { return readingChapter; }
    public int getReadingOffset() { return readingOffset; }

    public String getCoverColor() {
        return coverColor;
    }

    public String getContent() {
        return content;
    }

    public StudyPlan getPlan() {
        return plan;
    }

    public List<Chapter> getChapters() {
        return Collections.unmodifiableList(chapters);
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
