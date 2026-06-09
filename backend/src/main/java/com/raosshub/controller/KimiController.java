package com.raosshub.controller;

import com.raosshub.config.AppProperties;
import com.raosshub.security.UserDetailsImpl;
import com.raosshub.service.ConfigService;
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

/**
 * Proxy to Moonshot (Kimi) API.
 *
 * API key priority (no restart required for DB changes):
 *   1. DB  — project_configs.config.integrations.kimiApiKey  (set via Admin Setup → Integrations)
 *   2. YML — app.kimi.api-key in application.yml / APP_KIMI_API_KEY env var
 *
 * When the key is missing, returns 503 with error:"no_api_key" so the frontend
 * translation runner can detect it immediately and abort instead of retrying.
 */
@Slf4j
@RestController
@RequestMapping("/api/kimi")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class KimiController {

    private final AppProperties appProperties;
    private final ConfigService configService;
    private final RestTemplate  restTemplate = new RestTemplate();
    private final ObjectMapper  objectMapper = new ObjectMapper();

    @PostMapping
    public ResponseEntity<?> proxyToKimi(
            @RequestBody Map<String, Object> requestBody,
            @AuthenticationPrincipal UserDetailsImpl user) {

        // DB key first — allows admin to set/change key from UI without restart
        String apiKey = configService.getKimiApiKey();

        if (apiKey == null || apiKey.isBlank()) {
            // error field is 'no_api_key' — frontend isNoApiKey() helper detects this
            // and aborts the translation loop immediately instead of retrying
            return ResponseEntity.status(503).body(Map.of(
                "error",   "no_api_key",
                "message", "Kimi API key is not configured. Set it in Admin Setup → Integrations.",
                "content", List.of(Map.of("text",
                    "__KIMI_ERROR__: Kimi API key not configured. " +
                    "Go to Admin Setup → Integrations to add your key."))
            ));
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + apiKey);

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

            return ResponseEntity.status(response.getStatusCode()).body(response.getBody());

        } catch (Exception e) {
            log.error("Kimi proxy error: {}", e.getMessage());
            return ResponseEntity.status(502).body(Map.of(
                "error",   "proxy_error",
                "message", e.getMessage(),
                "content", List.of(Map.of("text", "__KIMI_ERROR__: " + e.getMessage()))
            ));
        }
    }
}
