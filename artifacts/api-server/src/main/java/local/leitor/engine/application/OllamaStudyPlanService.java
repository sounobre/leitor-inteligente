package local.leitor.engine.application;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OllamaStudyPlanService {
  private final ObjectMapper json;
  private final HttpClient http = HttpClient.newHttpClient();

  public OllamaStudyPlanService(ObjectMapper json) {
    this.json = json;
  }

  public Map<String, Object> createStudyPlan(String endpoint, String model, String content) {
    if (endpoint == null || endpoint.isBlank() || model == null || model.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ollama endpoint and model are required");
    }
    String prompt = """
        Create a language study plan from this text. Return ONLY valid JSON with exactly these arrays:
        vocabulary, idioms, phrasalVerbs. Each array has up to 8 objects with term, meaning (Portuguese),
        example, pronunciation, difficulty (CEFR). Use terms present or strongly implied by the text.
        TEXT:
        """ + content.substring(0, Math.min(content.length(), 24000));
    Map<String, Object> requestBody = Map.of(
        "model", model.trim(),
        "stream", false,
        "format", "json",
        "prompt", prompt
    );
    HttpRequest request;
    try {
      request = HttpRequest.newBuilder()
          .uri(URI.create(endpoint.replaceAll("/+$", "") + "/api/generate"))
          .header("Content-Type", "application/json")
          .timeout(Duration.ofSeconds(120))
          .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(requestBody)))
          .build();
    } catch (Exception exception) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid Ollama endpoint", exception);
    }
    final HttpResponse<String> response;
    try {
      response = http.send(request, HttpResponse.BodyHandlers.ofString());
    } catch (Exception exception) {
      throw new ResponseStatusException(
          HttpStatus.BAD_GATEWAY,
          "Could not connect to Ollama at the configured endpoint",
          exception
      );
    }
    if (response.statusCode() < 200 || response.statusCode() >= 300) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Ollama returned HTTP " + response.statusCode());
    }
    try {
      JsonNode envelope = json.readTree(response.body());
      JsonNode plan = json.readTree(envelope.path("response").asText());
      validatePlan(plan);
      return json.convertValue(plan, new TypeReference<>() {});
    } catch (ResponseStatusException exception) {
      throw exception;
    } catch (Exception exception) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Ollama returned an invalid study plan", exception);
    }
  }

  private void validatePlan(JsonNode plan) {
    if (!plan.isObject()) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Ollama plan must be a JSON object");
    }
    for (String category : List.of("vocabulary", "idioms", "phrasalVerbs")) {
      JsonNode items = plan.get(category);
      if (items == null || !items.isArray()) {
        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Ollama plan is missing " + category);
      }
      for (JsonNode item : items) {
        for (String field : List.of("term", "meaning", "example", "pronunciation", "difficulty")) {
          if (!item.hasNonNull(field) || item.get(field).asText().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Ollama plan contains an incomplete item");
          }
        }
      }
    }
  }
}