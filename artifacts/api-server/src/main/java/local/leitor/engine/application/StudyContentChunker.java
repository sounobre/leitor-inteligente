package local.leitor.engine.application;

import java.util.ArrayList;
import java.util.List;

/**
 * Divides conteúdo longo em blocos legíveis pelo modelo sem cortar palavras.
 */
public final class StudyContentChunker {
    public static final int DEFAULT_MAX_CHARS = 4_000;
    public static final int DEFAULT_OVERLAP_CHARS = 350;

    private final int maxChars;
    private final int overlapChars;

    public StudyContentChunker() {
        this(DEFAULT_MAX_CHARS, DEFAULT_OVERLAP_CHARS);
    }

    public StudyContentChunker(int maxChars, int overlapChars) {
        if (maxChars < 500 || overlapChars < 0 || overlapChars >= maxChars) {
            throw new IllegalArgumentException("Invalid study content chunk limits");
        }
        this.maxChars = maxChars;
        this.overlapChars = overlapChars;
    }

    public List<Chunk> split(String content) {
        if (content == null || content.isBlank()) {
            return List.of();
        }

        List<String> paragraphs = splitIntoParagraphs(content.trim());
        List<String> chunks = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (String paragraph : paragraphs) {
            for (String piece : splitOversizedParagraph(paragraph)) {
                appendPiece(chunks, current, piece);
            }
        }
        flush(chunks, current);

        List<Chunk> result = new ArrayList<>();
        for (int index = 0; index < chunks.size(); index++) {
            result.add(new Chunk(index + 1, chunks.size(), chunks.get(index)));
        }
        return result;
    }

    private List<String> splitIntoParagraphs(String content) {
        String[] raw = content.split("(?:\\r?\\n\\s*){2,}");
        List<String> paragraphs = new ArrayList<>();
        for (String paragraph : raw) {
            String normalized = paragraph.trim();
            if (!normalized.isBlank()) {
                paragraphs.add(normalized);
            }
        }
        return paragraphs.isEmpty() ? List.of(content) : paragraphs;
    }

    private List<String> splitOversizedParagraph(String paragraph) {
        if (paragraph.length() <= maxChars) {
            return List.of(paragraph);
        }

        List<String> pieces = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (String sentence : paragraph.split("(?<=[.!?])\\s+")) {
            if (!current.isEmpty() && current.length() + sentence.length() + 1 > maxChars) {
                pieces.add(current.toString());
                current.setLength(0);
            }
            if (sentence.length() > maxChars) {
                if (!current.isEmpty()) {
                    pieces.add(current.toString());
                    current.setLength(0);
                }
                splitAtWhitespace(sentence, pieces);
            } else {
                if (!current.isEmpty()) current.append(' ');
                current.append(sentence);
            }
        }
        if (!current.isEmpty()) pieces.add(current.toString());
        return pieces;
    }

    private void splitAtWhitespace(String text, List<String> pieces) {
        int start = 0;
        while (start < text.length()) {
            int end = Math.min(start + maxChars, text.length());
            if (end < text.length()) {
                int boundary = text.lastIndexOf(' ', end);
                if (boundary > start) end = boundary;
            }
            pieces.add(text.substring(start, end).trim());
            start = end;
            while (start < text.length() && Character.isWhitespace(text.charAt(start))) start++;
        }
    }

    private void appendPiece(List<String> chunks, StringBuilder current, String piece) {
        if (current.isEmpty()) {
            current.append(piece);
            return;
        }
        if (current.length() + piece.length() + 2 <= maxChars) {
            current.append("\n\n").append(piece);
            return;
        }

        String completed = current.toString();
        chunks.add(completed);
        current.setLength(0);
        String overlap = trailingOverlap(completed);
        if (!overlap.isBlank() && overlap.length() + piece.length() + 2 <= maxChars) {
            current.append(overlap).append("\n\n");
        }
        current.append(piece);
    }

    private void flush(List<String> chunks, StringBuilder current) {
        if (!current.isEmpty()) {
            chunks.add(current.toString());
        }
    }

    private String trailingOverlap(String content) {
        if (overlapChars == 0 || content.length() <= overlapChars) {
            return content;
        }
        int start = content.length() - overlapChars;
        int boundary = content.indexOf(' ', start);
        if (boundary > start && boundary < content.length() - 1) {
            start = boundary + 1;
        }
        return content.substring(start).trim();
    }

    public record Chunk(int index, int total, String content) {
    }
}