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
import org.springframework.stereotype.Component;
import local.leitor.engine.application.port.out.OllamaModelCatalogPort;
import local.leitor.engine.application.port.out.StudyPlanGeneratorPort;
import local.leitor.engine.domain.exception.StudyPlanGenerationException;
import local.leitor.engine.domain.model.OllamaModel;
import local.leitor.engine.domain.model.StudyItem;
import local.leitor.engine.domain.model.StudyPlan;
import local.leitor.shared.domain.BusinessValidationException;

/**
 * Infrastructure adapter that interacts with a local Ollama instance to generate study plans.
 */
@Component
 public class OllamaStudyPlanAdapter implements StudyPlanGeneratorPort, OllamaModelCatalogPort {
    private static final int MAX_PROMPT_CONTENT_LENGTH = 24000;
    private static final Duration HTTP_TIMEOUT = Duration.ofSeconds(120);

    private final ObjectMapper json;
    private final HttpClient http;

    @org.springframework.beans.factory.annotation.Autowired
    public OllamaStudyPlanAdapter(ObjectMapper json) {
        this.json = json;
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();
    }

    @Override
    public StudyPlan generatePlan(String endpoint, String model, String content) {
        if (endpoint == null || endpoint.isBlank()) {
            throw new BusinessValidationException("Ollama endpoint is required");
        }
        if (model == null || model.isBlank()) {
            throw new BusinessValidationException("Ollama model is required");
        }
        if (content == null || content.isBlank()) {
            throw new BusinessValidationException("Text content cannot be blank when generating study plan");
        }

        String prompt = buildPrompt(content);
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

        HttpResponse<String> response;
        try {
            response = http.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (Exception ex) {
            throw new StudyPlanGenerationException("Could not connect to Ollama at " + endpoint, ex);
        }

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new StudyPlanGenerationException("Ollama returned HTTP error status: " + response.statusCode());
        }

        try {
            JsonNode envelope = json.readTree(response.body());
            String responseText = envelope.path("response").asText();
            JsonNode planNode = json.readTree(responseText);
            return parseStudyPlan(planNode);
        } catch (StudyPlanGenerationException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new StudyPlanGenerationException("Failed to parse study plan response from Ollama", ex);
        }
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

    private String buildPrompt(String content) {
        String truncatedContent = content.substring(0, Math.min(content.length(), MAX_PROMPT_CONTENT_LENGTH));
        return """
            Create a language study plan from this text. Return ONLY valid JSON with exactly these arrays:
            vocabulary, idioms, phrasalVerbs. Each array has up to 8 objects with term, meaning (Portuguese),
            example, pronunciation, difficulty (CEFR). Use terms present or strongly implied by the text.
            TEXT:
            """ + truncatedContent;
    }

    private StudyPlan parseStudyPlan(JsonNode root) {
        if (root == null || !root.isObject()) {
            throw new StudyPlanGenerationException("Ollama plan must be a valid JSON object");
        }

        List<StudyItem> vocabulary = parseCategory(root, "vocabulary");
        List<StudyItem> idioms = parseCategory(root, "idioms");
        List<StudyItem> phrasalVerbs = parseCategory(root, "phrasalVerbs");

        return new StudyPlan(vocabulary, idioms, phrasalVerbs);
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
                items.add(new StudyItem(term, meaning, example, pronunciation, difficulty));
            }
        }
        return items;
    }
}
