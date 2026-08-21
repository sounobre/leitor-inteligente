package local.leitor.engine.infra.ollama;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import local.leitor.book.application.dto.PreparationProgress;
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

    @Test
    void createsSpoilerFreeVisualMaterialsFromOpenRouterResponse() throws Exception {
        StudyPlan plan = withOpenRouterResponse(validPlan(), endpoint -> {
            OllamaStudyPlanAdapter adapter = new OllamaStudyPlanAdapter(json);
            Field apiKey = OllamaStudyPlanAdapter.class.getDeclaredField("openRouterApiKey");
            apiKey.setAccessible(true);
            apiKey.set(adapter, "test-key");
            return adapter.generatePlan("openrouter", endpoint, "deepseek/test-model", "Private source text");
        });

        assertEquals("hesitate", plan.visualCards().getFirst().term());
        assertEquals("motion", plan.linguisticDecks().getFirst().id());
    }

    @Test
    void acceptsOpenRouterContentPartsWithTextBeforeJson() throws Exception {
        String responseText = "Aqui está o plano solicitado:\n" + json.writeValueAsString(validPlan());
        StudyPlan plan = withOpenRouterContent(List.of(Map.of("type", "text", "text", responseText)), endpoint -> {
            OllamaStudyPlanAdapter adapter = new OllamaStudyPlanAdapter(json);
            Field apiKey = OllamaStudyPlanAdapter.class.getDeclaredField("openRouterApiKey");
            apiKey.setAccessible(true);
            apiKey.set(adapter, "test-key");
            return adapter.generatePlan("openrouter", endpoint, "test-model", "Private source text");
        });

        assertEquals("hesitate", plan.visualCards().getFirst().term());
    }

    @Test
    void processesLongContentInMultipleChunksAndMergesEquivalentMaterial() throws Exception {
        AtomicInteger requests = new AtomicInteger();
        String longContent = "A neutral language pattern appears in this sentence. ".repeat(650);

        StudyPlan plan = withCountingOllamaResponse(validPlan(), requests, endpoint ->
            new OllamaStudyPlanAdapter(json).generatePlan(endpoint, "test-model", longContent)
        );

        assertEquals(true, requests.get() > 1);
        assertEquals(1, plan.vocabulary().size());
        assertEquals(1, plan.visualCards().size());
        assertEquals(1, plan.linguisticDecks().size());
    }

    @Test
    void generatesFourSpecializedStagesAndReportsTheirProgress() throws Exception {
        AtomicInteger requests = new AtomicInteger();
        List<PreparationProgress> progress = new ArrayList<>();

        StudyPlan plan = withCountingOllamaResponse(validPlan(), requests, endpoint ->
            new OllamaStudyPlanAdapter(json).generatePlan(
                "ollama", endpoint, "test-model", "A short, private source text.", progress::add
            )
        );

        assertEquals(4, requests.get());
        assertEquals(List.of(
            "Vocabulário", "Expressões e phrasal verbs", "Cartões visuais e decks", "Mapa semântico"
        ), progress.stream().map(PreparationProgress::activity).toList());
        assertEquals(List.of(1, 2, 3, 4), progress.stream().map(PreparationProgress::completedChunks).toList());
        assertEquals(4, progress.getLast().totalChunks());
        assertEquals(1, plan.vocabulary().size());
        assertEquals(1, plan.idioms().size());
        assertEquals(1, plan.phrasalVerbs().size());
        assertEquals(1, plan.visualCards().size());
    }

    @Test
    void processesLongOpenRouterContentInMultipleChunks() throws Exception {
        AtomicInteger requests = new AtomicInteger();
        String longContent = "A neutral language pattern appears in this sentence. ".repeat(650);

        StudyPlan plan = withCountingOpenRouterResponse(validPlan(), requests, endpoint -> {
            OllamaStudyPlanAdapter adapter = new OllamaStudyPlanAdapter(json);
            setOpenRouterKey(adapter);
            return adapter.generatePlan("openrouter", endpoint, "test-model", longContent);
        });

        assertEquals(true, requests.get() >= 8);
        assertEquals(0, requests.get() % 4);
        assertEquals(1, plan.vocabulary().size());
        assertEquals(1, plan.visualCards().size());
    }

    @Test
    void identifiesTheChunkWhenGenerationFails() throws Exception {
        AtomicInteger requests = new AtomicInteger();
        String longContent = "A neutral language pattern appears in this sentence. ".repeat(650);

        StudyPlanGenerationException exception = assertThrows(StudyPlanGenerationException.class, () ->
            withFailingSecondOllamaResponse(validPlan(), requests, endpoint ->
                new OllamaStudyPlanAdapter(json).generatePlan(endpoint, "test-model", longContent)
            )
        );

        assertEquals(true, exception.getMessage().contains("chunk 1 of"));
        assertEquals(true, exception.getMessage().contains("expressões e phrasal verbs"));
    }

    @Test
    void rejectsTruncatedOpenRouterResponseWithTheAffectedStage() throws Exception {
        StudyPlanGenerationException exception = assertThrows(StudyPlanGenerationException.class, () ->
            withTruncatedOpenRouterResponse(endpoint -> {
                OllamaStudyPlanAdapter adapter = new OllamaStudyPlanAdapter(json);
                setOpenRouterKey(adapter);
                return adapter.generatePlan("openrouter", endpoint, "test-model", "Private source text");
            })
        );

        assertEquals(true, exception.getMessage().contains("vocabulário"));
        assertEquals(true, exception.getMessage().contains("truncated"));
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

    private <T> T withCountingOllamaResponse(
        Map<String, Object> plan,
        AtomicInteger requests,
        ThrowingFunction<String, T> action
    ) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/api/generate", exchange -> {
            requests.incrementAndGet();
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

    private <T> T withFailingSecondOllamaResponse(
        Map<String, Object> plan,
        AtomicInteger requests,
        ThrowingFunction<String, T> action
    ) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/api/generate", exchange -> {
            int requestNumber = requests.incrementAndGet();
            if (requestNumber == 2) {
                exchange.sendResponseHeaders(500, -1);
                exchange.close();
                return;
            }
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

    private <T> T withOpenRouterResponse(Map<String, Object> plan, ThrowingFunction<String, T> action) throws Exception {
        return withOpenRouterContent("```json\n" + json.writeValueAsString(plan) + "\n```", action);
    }

    private <T> T withCountingOpenRouterResponse(
        Map<String, Object> plan,
        AtomicInteger requests,
        ThrowingFunction<String, T> action
    ) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/chat/completions", exchange -> {
            requests.incrementAndGet();
            byte[] body = json.writeValueAsBytes(Map.of(
                "choices", List.of(Map.of("message", Map.of("content", json.writeValueAsString(plan))))
            ));
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

    private <T> T withOpenRouterContent(Object content, ThrowingFunction<String, T> action) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/chat/completions", exchange -> {
            byte[] body = json.writeValueAsBytes(Map.of(
                "choices", List.of(Map.of("message", Map.of("content", content)))
            ));
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

    private <T> T withTruncatedOpenRouterResponse(ThrowingFunction<String, T> action) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/chat/completions", exchange -> {
            byte[] body = json.writeValueAsBytes(Map.of(
                "choices", List.of(Map.of(
                    "finish_reason", "length",
                    "message", Map.of("content", "{\"vocabulary\":[]}")
                ))
            ));
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

    private void setOpenRouterKey(OllamaStudyPlanAdapter adapter) throws Exception {
        Field apiKey = OllamaStudyPlanAdapter.class.getDeclaredField("openRouterApiKey");
        apiKey.setAccessible(true);
        apiKey.set(adapter, "test-key");
    }

    @FunctionalInterface
    private interface ThrowingFunction<I, O> {
        O apply(I input) throws Exception;
    }
}