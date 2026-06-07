package com.raosshub.controller;

import com.raosshub.config.AppProperties;
import com.raosshub.security.UserDetailsImpl;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/kimi")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class KimiController {

    private final AppProperties appProperties;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostMapping
    public ResponseEntity<?> proxyToKimi(
            @RequestBody Map<String, Object> requestBody,
            @AuthenticationPrincipal UserDetailsImpl user) {

        String apiKey = appProperties.getKimi().getApiKey();
        if (apiKey == null || apiKey.isEmpty()) {
            return ResponseEntity.status(503).body(Map.of(
                "error", "Kimi API key not configured",
                "content", List.of(Map.of("text", "__KIMI_ERROR__: Kimi API key not configured"))
            ));
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + apiKey);

            // Add the API key to the request body for Moonshot
            ObjectNode body = objectMapper.valueToTree(requestBody);
            if (!body.has("model")) {
                body.put("model", "moonshot-v1-8k");
            }

            HttpEntity<JsonNode> entity = new HttpEntity<>(body, headers);

            ResponseEntity<JsonNode> response = restTemplate.exchange(
                appProperties.getKimi().getBaseUrl() + "/chat/completions",
                HttpMethod.POST,
                entity,
                JsonNode.class
            );

            return ResponseEntity.status(response.getStatusCode())
                .body(response.getBody());

        } catch (Exception e) {
            log.error("Kimi proxy error: {}", e.getMessage());
            return ResponseEntity.status(502).body(Map.of(
                "error", e.getMessage(),
                "content", List.of(Map.of("text", "__KIMI_ERROR__: " + e.getMessage()))
            ));
        }
    }
}
