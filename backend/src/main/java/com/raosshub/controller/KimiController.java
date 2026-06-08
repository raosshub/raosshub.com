package com.raosshub.controller;

import com.raosshub.config.AppProperties;
import com.raosshub.security.UserDetailsImpl;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@RestController
@RequestMapping("/api/kimi")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class KimiController {

    private final AppProperties appProperties;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Per-user rate limiter — in-memory, no Redis required.
     * Each user gets their own Bucket initialised lazily on first request.
     * The bucket refills at rateLimitPerMinute tokens per 60 seconds (greedy).
     * On server restart the buckets reset, which is acceptable for this use case.
     */
    private final ConcurrentHashMap<Long, Bucket> rateLimiters = new ConcurrentHashMap<>();

    private Bucket getBucketForUser(Long userId) {
        return rateLimiters.computeIfAbsent(userId, id -> {
            int limit = appProperties.getKimi().getRateLimitPerMinute();
            Bandwidth bandwidth = Bandwidth.classic(
                limit,
                Refill.greedy(limit, Duration.ofMinutes(1))
            );
            return Bucket.builder().addLimit(bandwidth).build();
        });
    }

    @PostMapping
    public ResponseEntity<?> proxyToKimi(
            @RequestBody Map<String, Object> requestBody,
            @AuthenticationPrincipal UserDetailsImpl user) {

        // ── Rate limit check ───────────────────────────────────────────────
        Bucket bucket = getBucketForUser(user.getId());
        if (!bucket.tryConsume(1)) {
            int limit = appProperties.getKimi().getRateLimitPerMinute();
            log.warn("[Kimi] Rate limit hit for user {} (max {}/min)", user.getUsername(), limit);
            return ResponseEntity.status(429).body(Map.of(
                "error", "Rate limit exceeded",
                "content", List.of(Map.of(
                    "text",
                    "__KIMI_ERROR__: Rate limit exceeded — max " + limit +
                    " requests per minute. Please wait before sending another message."
                ))
            ));
        }

        // ── API key check ──────────────────────────────────────────────────
        String apiKey = appProperties.getKimi().getApiKey();
        if (apiKey == null || apiKey.isEmpty()) {
            return ResponseEntity.status(503).body(Map.of(
                "error", "Kimi API key not configured",
                "content", List.of(Map.of(
                    "text", "__KIMI_ERROR__: Kimi API key not configured"
                ))
            ));
        }

        // ── Proxy to Moonshot ──────────────────────────────────────────────
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

            return ResponseEntity.status(response.getStatusCode())
                .body(response.getBody());

        } catch (Exception e) {
            log.error("[Kimi] Proxy error for user {}: {}", user.getUsername(), e.getMessage());
            return ResponseEntity.status(502).body(Map.of(
                "error", e.getMessage(),
                "content", List.of(Map.of(
                    "text", "__KIMI_ERROR__: " + e.getMessage()
                ))
            ));
        }
    }
}
