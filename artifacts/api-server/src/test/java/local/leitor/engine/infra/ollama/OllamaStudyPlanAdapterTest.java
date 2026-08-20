package local.leitor.engine.infra.ollama;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import local.leitor.engine.domain.exception.StudyPlanGenerationException;
import local.leitor.engine.domain.model.StudyPlan;

class OllamaStudyPlanAdapterTest {
    private final ObjectMapper json = new ObjectMapper();

    @Test
    void createsSpoilerFreeVisualMaterialsFromOllamaResponse() throws Exception {
        StudyPlan plan = withOllamaResponse(validPlan(), endpoint ->
            new OllamaStudyPlanAdapter(json).generatePlan(endpoint, "test-model", "Private source text")
        );

        assertEquals("hesitate", plan.visualCards().getFirst().term());
        assertEquals("motion", plan.linguisticDecks().getFirst().id());
        assertEquals("uncertainty", plan.semanticMap().nodes().getFirst().id());
    }

    @Test
    void rejectsQuotedExamplesThatCouldBeBookExcerpts() throws Exception {
        Map<String, Object> unsafe = new HashMap<>(validPlan());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> sourceCards = (List<Map<String, Object>>) unsafe.get("visualCards");
        List<Map<String, Object>> cards = new ArrayList<>(sourceCards);
        Map<String, Object> unsafeCard = new HashMap<>(cards.getFirst());
        unsafeCard.put("example", "\"A copied-looking sentence.\"");
        cards.set(0, unsafeCard);
        unsafe.put("visualCards", cards);

        assertThrows(StudyPlanGenerationException.class, () ->
            withOllamaResponse(unsafe, endpoint ->
                new OllamaStudyPlanAdapter(json).generatePlan(endpoint, "test-model", "Private source text")
            )
        );
    }

    private <T> T withOllamaResponse(Map<String, Object> plan, ThrowingFunction<String, T> action) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/api/generate", exchange -> {
            String innerPlan = json.writeValueAsString(plan);
            byte[] body = json.writeValueAsBytes(Map.of("response", innerPlan));
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
        try {
            return action.apply("http://127.0.0.1:" + server.getAddress().getPort());
        } finally {
            server.stop(0);
        }
    }

    private Map<String, Object> validPlan() {
        Map<String, Object> item = Map.of(
            "term", "hesitate",
            "meaning", "hesitar",
            "example", "She paused before choosing a path.",
            "pronunciation", "/ˈhezɪteɪt/",
            "difficulty", "B1"
        );
        return Map.of(
            "vocabulary", List.of(item),
            "idioms", List.of(item),
            "phrasalVerbs", List.of(item),
            "visualCards", List.of(Map.of(
                "term", "hesitate",
                "meaning", "hesitar",
                "example", "She paused before choosing a path.",
                "visualCue", "A signpost with two clear arrows.",
                "technique", "Verb of uncertainty",
                "pronunciation", "/ˈhezɪteɪt/",
                "difficulty", "B1"
            )),
            "linguisticDecks", List.of(Map.of(
                "id", "motion",
                "title", "Movimento",
                "purpose", "Descrever deslocamento e decisão.",
                "items", List.of(item)
            )),
            "semanticMap", Map.of(
                "nodes", List.of(Map.of("id", "uncertainty", "label", "uncertainty", "description", "Dúvida e decisão.")),
                "connections", List.of(Map.of("fromId", "uncertainty", "toId", "uncertainty", "relationship", "reforça a ideia"))
            )
        );
    }

    @FunctionalInterface
    private interface ThrowingFunction<I, O> {
        O apply(I input) throws Exception;
    }
}