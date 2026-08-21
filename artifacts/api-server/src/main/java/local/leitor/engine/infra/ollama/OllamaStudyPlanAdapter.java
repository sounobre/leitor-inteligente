package local.leitor.engine.infra.ollama;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import local.leitor.engine.application.StudyContentChunker;
import local.leitor.engine.application.StudyPlanAggregator;
import local.leitor.book.application.dto.PreparationProgress;
import local.leitor.engine.application.port.out.OllamaModelCatalogPort;
import local.leitor.engine.application.port.out.OpenRouterModelCatalogPort;
import local.leitor.engine.application.port.out.StudyPlanGeneratorPort;
import local.leitor.engine.domain.exception.StudyPlanGenerationException;
import local.leitor.engine.domain.exception.OpenRouterPaymentRequiredException;
import local.leitor.engine.domain.exception.OpenRouterRateLimitException;
import local.leitor.engine.domain.model.OllamaModel;
import local.leitor.engine.domain.model.LinguisticDeck;
import local.leitor.engine.domain.model.SemanticConnection;
import local.leitor.engine.domain.model.SemanticMap;
import local.leitor.engine.domain.model.SemanticNode;
import local.leitor.engine.domain.model.StudyItem;
import local.leitor.engine.domain.model.StudyPlan;
import local.leitor.engine.domain.model.VisualStudyCard;
import local.leitor.shared.domain.BusinessValidationException;

/**
 * Infrastructure adapter that interacts with a local Ollama instance to generate study plans.
 */
@Component
public class OllamaStudyPlanAdapter implements StudyPlanGeneratorPort, OllamaModelCatalogPort, OpenRouterModelCatalogPort {
    private static final Duration HTTP_TIMEOUT = Duration.ofSeconds(120);
    private static final Logger log = LoggerFactory.getLogger(OllamaStudyPlanAdapter.class);

    private final ObjectMapper json;
    private final HttpClient http;
    private final StudyContentChunker chunker;
    private final StudyPlanAggregator aggregator;
    @Value("${OPENROUTER_API_KEY:}")
    private String openRouterApiKey;

    private enum GenerationStage {
        VOCABULARY("Vocabulário", 1_600),
        EXPRESSIONS("Expressões e phrasal verbs", 1_800),
        VISUAL_MATERIALS("Cartões visuais e decks", 2_400),
        SEMANTIC_MAP("Mapa semântico", 1_200);

        private final String displayName;
        private final int maxTokens;

        GenerationStage(String displayName, int maxTokens) {
            this.displayName = displayName;
            this.maxTokens = maxTokens;
        }
    }

    @org.springframework.beans.factory.annotation.Autowired
    public OllamaStudyPlanAdapter(ObjectMapper json) {
        this.json = json;
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();
        this.chunker = new StudyContentChunker();
        this.aggregator = new StudyPlanAggregator();
    }

    @Override
    public StudyPlan generatePlan(String endpoint, String model, String content) {
        return generatePlan("ollama", endpoint, model, content);
    }

    @Override
    public StudyPlan generatePlan(String provider, String endpoint, String model, String content) {
        return generatePlan(provider, endpoint, model, content, progress -> {});
    }

    @Override
    public StudyPlan generatePlan(
        String provider,
        String endpoint,
        String model,
        String content,
        Consumer<PreparationProgress> progressListener
    ) {
        if (content == null || content.isBlank()) {
            throw new BusinessValidationException("Text content cannot be blank when generating study plan");
        }
        if (model == null || model.isBlank()) {
            throw new BusinessValidationException("AI provider model is required");
        }
        if (!"openrouter".equalsIgnoreCase(provider) && (endpoint == null || endpoint.isBlank())) {
            throw new BusinessValidationException("Ollama endpoint is required");
        }

        List<StudyContentChunker.Chunk> chunks = chunker.split(content);
        int totalStages = chunks.size() * GenerationStage.values().length;
        log.info(
            "AI study plan request provider={} model={} contentChars={} chunks={} stages={}",
            provider, model, content.length(), chunks.size(), totalStages
        );
        List<StudyPlan> plans = new ArrayList<>();
        Consumer<PreparationProgress> listener = progressListener == null ? progress -> {} : progressListener;
        int completedStages = 0;
        for (StudyContentChunker.Chunk chunk : chunks) {
            for (GenerationStage stage : GenerationStage.values()) {
                log.info(
                    "AI study plan stage provider={} model={} chunk={}/{} stage={} contentChars={}",
                    provider, model, chunk.index(), chunk.total(), stage.name(), chunk.content().length()
                );
                try {
                    plans.add("openrouter".equalsIgnoreCase(provider)
                        ? generateOpenRouterPlan(endpoint, model, chunk.content(), stage)
                        : generateOllamaPlan(endpoint, model, chunk.content(), stage));
                    completedStages++;
                    listener.accept(PreparationProgress.preparing(completedStages, totalStages, stage.displayName));
                } catch (StudyPlanGenerationException ex) {
                    throw new StudyPlanGenerationException(
                        "Failed to generate " + stage.displayName.toLowerCase()
                            + " for chunk " + chunk.index() + " of " + chunk.total() + ": " + ex.getMessage(),
                        ex
                    );
                }
            }
        }
        StudyPlan mergedPlan = aggregator.aggregate(plans);
        log.info(
            "AI study plan merged chunks={} vocabulary={} visualCards={} decks={} semanticNodes={}",
            chunks.size(),
            mergedPlan.vocabulary().size(),
            mergedPlan.visualCards().size(),
            mergedPlan.linguisticDecks().size(),
            mergedPlan.semanticMap().nodes().size()
        );
        return mergedPlan;
    }

    private StudyPlan generateOllamaPlan(String endpoint, String model, String content, GenerationStage stage) {
        String prompt = buildPrompt(content, stage);
        Map<String, Object> requestBody = Map.of(
            "model", model.trim(),
            "stream", false,
            "format", "json",
            "prompt", prompt
        );

        HttpRequest request;
        try {
            String uriString = endpoint.replaceAll("/+$", "") + "/api/generate";
            request = HttpRequest.newBuilder()
                .uri(URI.create(uriString))
                .header("Content-Type", "application/json")
                .timeout(HTTP_TIMEOUT)
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(requestBody)))
                .build();
        } catch (Exception ex) {
            throw new BusinessValidationException("Invalid Ollama endpoint URL: " + endpoint);
        }

        try {
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            log.info("Ollama study plan response status={} bodyChars={}", response.statusCode(), response.body().length());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new StudyPlanGenerationException("Ollama returned HTTP error status: " + response.statusCode());
            }
            JsonNode envelope = json.readTree(response.body());
            return parseStagePlan(json.readTree(envelope.path("response").asText()), stage);
        } catch (StudyPlanGenerationException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new StudyPlanGenerationException("Failed to parse study plan response from Ollama", ex);
        }
    }

    private StudyPlan generateOpenRouterPlan(String endpoint, String model, String content, GenerationStage stage) {
        if (openRouterApiKey == null || openRouterApiKey.isBlank()) {
            throw new BusinessValidationException("OPENROUTER_API_KEY is not configured in Replit Secrets");
        }
        if (model == null || model.isBlank()) {
            throw new BusinessValidationException("OpenRouter model is required");
        }
        if (content == null || content.isBlank()) {
            throw new BusinessValidationException("Text content cannot be blank when generating study plan");
        }
        String baseUrl = endpoint == null || endpoint.isBlank() ? "https://openrouter.ai/api/v1" : endpoint.trim();
        Map<String, Object> requestBody = Map.of(
            "model", model.trim(),
            "messages", List.of(Map.of("role", "user", "content", buildPrompt(content, stage))),
            "max_tokens", stage.maxTokens
        );
        HttpRequest request;
        try {
            request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl.replaceAll("/+$", "") + "/chat/completions"))
                .header("Authorization", "Bearer " + openRouterApiKey.trim())
                .header("Content-Type", "application/json")
                .header("HTTP-Referer", "https://replit.com")
                .header("X-Title", "Leitor Inteligente")
                .timeout(HTTP_TIMEOUT)
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(requestBody)))
                .build();
        } catch (Exception ex) {
            throw new BusinessValidationException("Invalid OpenRouter endpoint URL: " + baseUrl);
        }
        try {
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            log.info("OpenRouter study plan response status={} bodyChars={}", response.statusCode(), response.body().length());
            if (response.statusCode() == 402) {
                throw new OpenRouterPaymentRequiredException(
                    "O modelo \"" + model + "\" precisa de créditos no OpenRouter. Escolhe um modelo marcado como gratuito ou adiciona créditos à conta."
                );
            }
            if (response.statusCode() == 429) {
                throw new OpenRouterRateLimitException(
                    "O OpenRouter atingiu o limite temporário para o modelo \"" + model + "\". Aguarda alguns segundos ou escolhe outro modelo gratuito."
                );
            }
            JsonNode responseRoot = json.readTree(response.body());
            JsonNode firstChoice = responseRoot.path("choices").path(0);
            JsonNode messageNode = firstChoice.path("message");
            JsonNode contentNode = messageNode.path("content");
            log.info(
                "OpenRouter study plan response status={} finishReason={} contentType={} contentChars={}",
                response.statusCode(),
                firstChoice.path("finish_reason").asText(""),
                contentNode.isArray() ? "array" : contentNode.isTextual() ? "text" : contentNode.isMissingNode() ? "missing" : contentNode.getNodeType(),
                contentNode.isTextual() ? contentNode.asText().length() : contentNode.toString().length()
            );
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new StudyPlanGenerationException("OpenRouter returned HTTP error status: " + response.statusCode());
            }
            JsonNode root = responseRoot;
            String finishReason = root.path("choices").path(0).path("finish_reason").asText("");
            if ("length".equalsIgnoreCase(finishReason)) {
                throw new StudyPlanGenerationException(
                    "OpenRouter truncated the study plan response. Choose a shorter plan/model and try again."
                );
            }
            return parseStagePlan(parseOpenRouterPlan(root), stage);
        } catch (StudyPlanGenerationException ex) {
            log.warn("OpenRouter study plan failed: {}", ex.getMessage());
            throw ex;
        } catch (Exception ex) {
            log.warn("OpenRouter study plan response could not be parsed: {}", ex.getMessage());
            String reason = ex.getMessage() == null || ex.getMessage().isBlank()
                ? ex.getClass().getSimpleName()
                : ex.getMessage();
            throw new StudyPlanGenerationException("OpenRouter returned an unreadable study plan: " + reason, ex);
        }
    }

    private JsonNode parseOpenRouterPlan(JsonNode root) {
        if (root == null || !root.isObject()) {
            throw new StudyPlanGenerationException("OpenRouter returned an empty or invalid response");
        }
        JsonNode choice = root.path("choices").path(0);
        if (!choice.isObject()) {
            throw new StudyPlanGenerationException("OpenRouter response did not contain a completion choice");
        }
        JsonNode message = choice.path("message");
        JsonNode contentNode = message.path("content");
        String responseText;
        if (contentNode.isTextual()) {
            responseText = contentNode.asText();
        } else if (contentNode.isArray()) {
            StringBuilder combined = new StringBuilder();
            for (JsonNode part : contentNode) {
                combined.append(part.isTextual() ? part.asText() : part.path("text").asText(""));
            }
            responseText = combined.toString();
        } else {
            responseText = message.path("reasoning").asText("");
        }

        String cleaned = stripMarkdownFence(responseText);
        try {
            return json.readTree(cleaned);
        } catch (Exception firstParseFailure) {
            int objectStart = cleaned.indexOf('{');
            int objectEnd = cleaned.lastIndexOf('}');
            if (objectStart >= 0 && objectEnd > objectStart) {
                try {
                    return json.readTree(cleaned.substring(objectStart, objectEnd + 1));
                } catch (Exception ignored) {
                    // Use the specific domain error below instead of exposing provider text.
                }
            }
            throw new StudyPlanGenerationException("OpenRouter did not return a valid JSON study plan");
        }
    }

    private String stripMarkdownFence(String content) {
        String trimmed = content == null ? "" : content.trim();
        trimmed = trimmed.replaceFirst("^```(?:json|JSON)?\\s*", "");
        return trimmed.replaceFirst("\\s*```$", "");
    }

    @Override
    public List<OllamaModel> listModels(String endpoint) {
        if (endpoint == null || endpoint.isBlank()) {
            throw new BusinessValidationException("Ollama endpoint is required");
        }

        HttpRequest request;
        try {
            request = HttpRequest.newBuilder()
                .uri(URI.create(endpoint.replaceAll("/+$", "") + "/api/tags"))
                .timeout(Duration.ofSeconds(15))
                .GET()
                .build();
        } catch (Exception ex) {
            throw new BusinessValidationException("Invalid Ollama endpoint URL: " + endpoint);
        }

        final HttpResponse<String> response;
        try {
            response = http.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (Exception ex) {
            throw new StudyPlanGenerationException("Could not connect to Ollama at " + endpoint, ex);
        }
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new StudyPlanGenerationException("Ollama returned HTTP error status: " + response.statusCode());
        }

        try {
            JsonNode root = json.readTree(response.body());
            JsonNode models = root.path("models");
            if (!models.isArray()) {
                throw new StudyPlanGenerationException("Ollama returned an invalid model catalog");
            }
            List<OllamaModel> result = new ArrayList<>();
            for (JsonNode model : models) {
                String name = model.path("name").asText("").trim();
                if (!name.isBlank()) {
                    result.add(new OllamaModel(name));
                }
            }
            return result;
        } catch (StudyPlanGenerationException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new StudyPlanGenerationException("Failed to parse Ollama model catalog", ex);
        }
    }

    @Override
    public List<OllamaModel> listOpenRouterModels(String endpoint) {
        if (openRouterApiKey == null || openRouterApiKey.isBlank()) {
            throw new BusinessValidationException("OPENROUTER_API_KEY is not configured in Replit Secrets");
        }
        String baseUrl = endpoint == null || endpoint.isBlank() ? "https://openrouter.ai/api/v1" : endpoint.trim();
        HttpRequest request;
        try {
            request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl.replaceAll("/+$", "") + "/models"))
                .header("Authorization", "Bearer " + openRouterApiKey.trim())
                .timeout(Duration.ofSeconds(15))
                .GET()
                .build();
        } catch (Exception ex) {
            throw new BusinessValidationException("Invalid OpenRouter endpoint URL: " + baseUrl);
        }
        try {
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 429) {
                throw new OpenRouterRateLimitException(
                    "O catálogo do OpenRouter atingiu o limite temporário. Aguarda alguns segundos e tenta atualizar novamente."
                );
            }
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new StudyPlanGenerationException("OpenRouter returned HTTP error status: " + response.statusCode());
            }
            JsonNode data = json.readTree(response.body()).path("data");
            if (!data.isArray()) {
                throw new StudyPlanGenerationException("OpenRouter returned an invalid model catalog");
            }
            List<OllamaModel> result = new ArrayList<>();
            for (JsonNode model : data) {
                String id = model.path("id").asText("").trim();
                if (!id.isBlank()) result.add(new OllamaModel(id));
            }
            return result;
        } catch (StudyPlanGenerationException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new StudyPlanGenerationException("Failed to parse OpenRouter model catalog", ex);
        }
    }

    private String buildPrompt(String content, GenerationStage stage) {
        return """
            Create a spoiler-free language preparation plan for a reader before they start a book.
            You may analyze the text privately to identify language patterns, difficulty, register, and semantic fields,
            but you MUST NOT reveal plot facts, character names, locations, events, distinctive details, summaries,
            or any sentence/excerpt from the text.

            %s

            Never pad with irrelevant or invented terms just to reach a number, and do not repeat the same term
            within a category. Every example MUST be an original neutral sentence written by you, not a quote,
            paraphrase, or identifiable scene from the text.
            Never use proper names from the text. Never include quotation marks or copied phrases. Use terms present or
            strongly implied by the text, but make every explanation and example safe before reading.
            Return compact JSON without Markdown or explanatory text outside the JSON object. The output limit is a
            technical ceiling, not a target: if the chunk has few worthwhile candidates, return few items; if it has
            many, keep the most useful and diverse ones that fit safely.
            TEXT CHUNK:
            %s
            """.formatted(stageInstructions(stage), content.trim());
    }

    private String stageInstructions(GenerationStage stage) {
        return switch (stage) {
            case VOCABULARY -> """
                Return ONLY valid JSON with exactly one field: vocabulary.
                Select the high-value, distinct words that most help the reader understand the chunk's language,
                register, imagery, and emotional nuance. Stop when the useful candidates are exhausted; do not target
                a fixed count. Each object has term, meaning (Brazilian Portuguese), example, pronunciation,
                difficulty (CEFR). Meanings must be at most 12 words and original neutral examples at most 12 words.
                Keep the full JSON below roughly 1,200 tokens; this is a safety ceiling, not a quantity goal.
                """;
            case EXPRESSIONS -> """
                Return ONLY valid JSON with exactly two fields: idioms and phrasalVerbs.
                Select useful, distinct idiomatic expressions and phrasal verbs or verb-particle constructions present
                or strongly implied by the chunk. Each object has term, meaning (Brazilian Portuguese), example,
                pronunciation, difficulty (CEFR). Meanings must be at most 12 words and original neutral examples at
                most 12 words. Stop when relevant candidates are exhausted; do not target a fixed count and do not
                turn arbitrary verb phrases into phrasal verbs. Keep the full JSON below roughly 1,400 tokens; this
                is a safety ceiling, not a quantity goal.
                """;
            case VISUAL_MATERIALS -> """
                Return ONLY valid JSON with exactly two fields: visualCards and linguisticDecks.
                Create cards only for useful, distinct concepts that benefit from visual memory. Each card has term,
                meaning (Brazilian Portuguese), example, visualCue, technique, pronunciation, difficulty. Meanings
                and visual cues must be at most 12 words; examples and techniques at most 12 words. visualCue must be
                an abstract, generic memory aid. Organize cards into coherent decks only when a useful grouping exists.
                Decks have id, title (Brazilian Portuguese), purpose (Brazilian Portuguese), and items with term,
                meaning, example, pronunciation, difficulty. Titles must be at most 4 words and purposes at most 12.
                Choose broad language goals such as emotion, contrast, description, uncertainty, movement, or cause
                and consequence. Do not invent extra decks or cards to reach a target. Keep the full JSON below roughly
                1,900 tokens; this is a safety ceiling, not a quantity goal.
                """;
            case SEMANTIC_MAP -> """
                Return ONLY valid JSON with exactly one field: semanticMap.
                semanticMap has nodes and connections. Include distinct broad language concepts, register, imagery,
                emotion, or grammar relationships useful for preparing the reader. Nodes have id, label (English),
                description (Brazilian Portuguese), and connections have fromId, toId, relationship (Brazilian
                Portuguese). Descriptions must be at most 16 words and relationships at most 5 words. Stop when the
                useful concepts are covered; never pad the map and never map book events. Keep the full JSON below
                roughly 900 tokens; this is a safety ceiling, not a quantity goal.
                """;
        };
    }

    private StudyPlan parseStagePlan(JsonNode root, GenerationStage stage) {
        if (root == null || !root.isObject()) {
            throw new StudyPlanGenerationException("Ollama plan must be a valid JSON object");
        }

        return switch (stage) {
            case VOCABULARY -> new StudyPlan(
                parseCategory(root, "vocabulary"), List.of(), List.of(), List.of(), List.of(), SemanticMap.empty()
            );
            case EXPRESSIONS -> new StudyPlan(
                List.of(), parseCategory(root, "idioms"), parseCategory(root, "phrasalVerbs"), List.of(), List.of(), SemanticMap.empty()
            );
            case VISUAL_MATERIALS -> new StudyPlan(
                List.of(), List.of(), List.of(), parseVisualCards(root), parseLinguisticDecks(root), SemanticMap.empty()
            );
            case SEMANTIC_MAP -> new StudyPlan(
                List.of(), List.of(), List.of(), List.of(), List.of(), parseSemanticMap(root)
            );
        };
    }

    private List<StudyItem> parseCategory(JsonNode root, String categoryName) {
        JsonNode categoryNode = root.get(categoryName);
        if (categoryNode == null || !categoryNode.isArray()) {
            throw new StudyPlanGenerationException("Ollama plan is missing array category: " + categoryName);
        }

        List<StudyItem> items = new ArrayList<>();
        for (JsonNode itemNode : categoryNode) {
            String term = itemNode.path("term").asText("").trim();
            String meaning = itemNode.path("meaning").asText("").trim();
            String example = itemNode.path("example").asText("").trim();
            String pronunciation = itemNode.path("pronunciation").asText("").trim();
            String difficulty = itemNode.path("difficulty").asText("B2").trim();

            if (!term.isBlank() && !meaning.isBlank()) {
                items.add(new StudyItem(term, meaning, requireOriginalExample(example), pronunciation, difficulty));
            }
        }
        return items;
    }

    private List<VisualStudyCard> parseVisualCards(JsonNode root) {
        JsonNode cardsNode = requireArray(root, "visualCards");
        List<VisualStudyCard> cards = new ArrayList<>();
        for (JsonNode cardNode : cardsNode) {
            String term = cardNode.path("term").asText("").trim();
            String meaning = cardNode.path("meaning").asText("").trim();
            String example = cardNode.path("example").asText("").trim();
            if (!term.isBlank() && !meaning.isBlank() && !example.isBlank()) {
                cards.add(new VisualStudyCard(
                    term,
                    meaning,
                    requireOriginalExample(example),
                    cardNode.path("visualCue").asText(""),
                    cardNode.path("technique").asText(""),
                    cardNode.path("pronunciation").asText(""),
                    cardNode.path("difficulty").asText("B2")
                ));
            }
        }
        return cards;
    }

    private List<LinguisticDeck> parseLinguisticDecks(JsonNode root) {
        JsonNode decksNode = requireArray(root, "linguisticDecks");
        List<LinguisticDeck> decks = new ArrayList<>();
        for (JsonNode deckNode : decksNode) {
            String id = deckNode.path("id").asText("").trim();
            String title = deckNode.path("title").asText("").trim();
            JsonNode itemsNode = deckNode.path("items");
            if (id.isBlank() || title.isBlank() || !itemsNode.isArray()) {
                continue;
            }
            List<StudyItem> items = new ArrayList<>();
            for (JsonNode itemNode : itemsNode) {
                String term = itemNode.path("term").asText("").trim();
                String meaning = itemNode.path("meaning").asText("").trim();
                if (!term.isBlank() && !meaning.isBlank()) {
                    items.add(new StudyItem(
                        term,
                        meaning,
                        requireOriginalExample(itemNode.path("example").asText("")),
                        itemNode.path("pronunciation").asText(""),
                        itemNode.path("difficulty").asText("B2")
                    ));
                }
            }
            decks.add(new LinguisticDeck(id, title, deckNode.path("purpose").asText(""), items));
        }
        return decks;
    }

    private SemanticMap parseSemanticMap(JsonNode root) {
        JsonNode mapNode = root.path("semanticMap");
        if (!mapNode.isObject()) {
            throw new StudyPlanGenerationException("Ollama plan is missing semanticMap object");
        }
        List<SemanticNode> nodes = new ArrayList<>();
        for (JsonNode node : requireArray(mapNode, "nodes")) {
            String id = node.path("id").asText("").trim();
            String label = node.path("label").asText("").trim();
            if (!id.isBlank() && !label.isBlank()) {
                nodes.add(new SemanticNode(id, label, node.path("description").asText("")));
            }
        }
        List<SemanticConnection> connections = new ArrayList<>();
        for (JsonNode connection : requireArray(mapNode, "connections")) {
            String fromId = connection.path("fromId").asText("").trim();
            String toId = connection.path("toId").asText("").trim();
            if (!fromId.isBlank() && !toId.isBlank()) {
                connections.add(new SemanticConnection(fromId, toId, connection.path("relationship").asText("")));
            }
        }
        return new SemanticMap(nodes, connections);
    }

    private JsonNode requireArray(JsonNode root, String name) {
        JsonNode node = root.get(name);
        if (node == null || !node.isArray()) {
            throw new StudyPlanGenerationException("Ollama plan is missing array category: " + name);
        }
        return node;
    }

    private String requireOriginalExample(String example) {
        String normalized = example != null ? example.trim() : "";
        if (normalized.isBlank() || normalized.length() > 220 || normalized.contains("\"") || normalized.contains("“") || normalized.contains("”")) {
            throw new StudyPlanGenerationException("Study examples must be short original sentences without quotations");
        }
        return normalized;
    }
}
