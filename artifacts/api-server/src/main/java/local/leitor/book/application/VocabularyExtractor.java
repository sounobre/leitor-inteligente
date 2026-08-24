package local.leitor.book.application;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;
import local.leitor.book.domain.model.Chapter;
import local.leitor.book.domain.model.VocabularyWord;

@Component
public class VocabularyExtractor {
    private static final Pattern WORD = Pattern.compile("[\\p{L}]+(?:['’\\-][\\p{L}]+)*");

    public List<VocabularyWord> extract(List<Chapter> chapters) {
        Map<String, WordData> words = new LinkedHashMap<>();
        for (Chapter chapter : chapters) {
            Matcher matcher = WORD.matcher(chapter.content());
            while (matcher.find()) {
                String display = matcher.group().replace('’', '\'');
                String normalized = normalize(display);
                WordData data = words.computeIfAbsent(normalized, ignored -> new WordData(display));
                data.occurrences++;
                data.chapters.add(chapter.position());
            }
        }
        return words.entrySet().stream()
            .map(entry -> new VocabularyWord(entry.getValue().display, entry.getKey(), entry.getValue().occurrences,
                new ArrayList<>(entry.getValue().chapters), false))
            .toList();
    }

    public static String normalize(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFKC).toLowerCase(Locale.ROOT);
    }

    private static final class WordData {
        private final String display;
        private int occurrences;
        private final LinkedHashSet<Integer> chapters = new LinkedHashSet<>();
        private WordData(String display) { this.display = display; }
    }
}