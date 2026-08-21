package local.leitor.engine.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class StudyContentChunkerTest {
    @Test
    void keepsParagraphsTogetherAndCarriesOverlapIntoNextChunk() {
        StudyContentChunker chunker = new StudyContentChunker(600, 100);
        String first = paragraph("first", 280);
        String second = paragraph("second", 280);
        String third = paragraph("third", 280);

        List<StudyContentChunker.Chunk> chunks = chunker.split(first + "\n\n" + second + "\n\n" + third);

        assertThat(chunks).hasSize(2);
        assertThat(chunks.getFirst().content()).contains("first").contains("second");
        assertThat(chunks.get(1).content()).contains("third").contains("second");
        assertThat(chunks).allSatisfy(chunk -> assertThat(chunk.content().length()).isLessThanOrEqualTo(600));
        assertThat(chunks).extracting(StudyContentChunker.Chunk::index).containsExactly(1, 2);
    }

    @Test
    void splitsLongParagraphsAtSentenceOrWordBoundaries() {
        StudyContentChunker chunker = new StudyContentChunker(600, 80);
        String content = "A complete sentence stays intact. ".repeat(50);

        List<StudyContentChunker.Chunk> chunks = chunker.split(content);

        assertThat(chunks).hasSizeGreaterThan(1);
        assertThat(chunks).allSatisfy(chunk -> {
            assertThat(chunk.content()).doesNotStartWith(" ");
            assertThat(chunk.content().length()).isLessThanOrEqualTo(600);
        });
    }

    @Test
    void usesSmallerDefaultsToKeepGenerationFocused() {
        StudyContentChunker chunker = new StudyContentChunker();
        String content = paragraph("compact", 4_500);

        List<StudyContentChunker.Chunk> chunks = chunker.split(content);

        assertThat(chunks).hasSizeGreaterThan(1);
        assertThat(chunks).allSatisfy(chunk ->
            assertThat(chunk.content().length()).isLessThanOrEqualTo(StudyContentChunker.DEFAULT_MAX_CHARS)
        );
        assertThat(StudyContentChunker.DEFAULT_MAX_CHARS).isEqualTo(4_000);
        assertThat(StudyContentChunker.DEFAULT_OVERLAP_CHARS).isEqualTo(350);
    }

    private String paragraph(String label, int length) {
        return (label + " language pattern. ").repeat(Math.max(1, length / (label.length() + 19)));
    }
}