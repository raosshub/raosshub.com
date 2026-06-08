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
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
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
     * Shared by both /api/kimi and /api/kimi/stream so the limit is
     * enforced across both call paths.
     */
    private final ConcurrentHashMap<Long, Bucket> rateLimiters = new ConcurrentHashMap<>();

    private Bucket getBucketForUser(Long userId) {
        return rateLimiters.computeIfAbsent(userId, id -> {
            int limit = appProperties.getKimi().getRateLimitPerMinute();
            return Bucket.builder()
                .addLimit(Bandwidth.classic(limit, Refill.greedy(limit, Duration.ofMinutes(1))))
                .build();
        });
    }

    // ─── Non-streaming (fire-and-wait) ────────────────────────────────────────
    // Kept for backwards compatibility with any code that calls /api/kimi directly.

    @PostMapping
    public ResponseEntity<?> proxyToKimi(
            @RequestBody Map<String, Object> requestBody,
            @AuthenticationPrincipal UserDetailsImpl user) {

        Bucket bucket = getBucketForUser(user.getId());
        if (!bucket.tryConsume(1)) {
            int limit = appProperties.getKimi().getRateLimitPerMinute();
            log.warn("[Kimi] Rate limit hit for user {} (max {}/min)", user.getUsername(), limit);
            return ResponseEntity.status(429).body(Map.of(
                "error", "rate_limit",
                "content", List.of(Map.of("text",
                    "__KIMI_ERROR__: Rate limit exceeded — max " + limit + " requests/minute. "
                    + "请求超速，每分钟最多 " + limit + " 次。"))
            ));
        }

        String apiKey = appProperties.getKimi().getApiKey();
        if (apiKey == null || apiKey.isEmpty()) {
            return ResponseEntity.status(503).body(Map.of(
                "error", "no_api_key",
                "content", List.of(Map.of("text", "__KIMI_ERROR__: Kimi API key not configured"))
            ));
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + apiKey);

            ObjectNode body = objectMapper.valueToTree(requestBody);
            if (!body.has("model")) body.put("model", "moonshot-v1-8k");

            HttpEntity<JsonNode> entity = new HttpEntity<>(body, headers);
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                appProperties.getKimi().getBaseUrl() + "/chat/completions",
                HttpMethod.POST, entity, JsonNode.class
            );
            return ResponseEntity.status(response.getStatusCode()).body(response.getBody());

        } catch (Exception e) {
            log.error("[Kimi] Proxy error for user {}: {}", user.getUsername(), e.getMessage());
            return ResponseEntity.status(502).body(Map.of(
                "error", e.getMessage(),
                "content", List.of(Map.of("text", "__KIMI_ERROR__: " + e.getMessage()))
            ));
        }
    }

    // ─── Streaming (SSE) ──────────────────────────────────────────────────────
    // Returns text/event-stream. Each SSE event is a raw Moonshot delta chunk.
    // Special "error" events carry both message_en and message_zh for i18n.
    // Requires nginx proxy_buffering off — see nginx/default.conf.

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamKimi(
            @RequestBody Map<String, Object> requestBody,
            @AuthenticationPrincipal UserDetailsImpl user) {

        SseEmitter emitter = new SseEmitter(120_000L); // 2 min max

        // ── Rate limit ────────────────────────────────────────────────────────
        Bucket bucket = getBucketForUser(user.getId());
        if (!bucket.tryConsume(1)) {
            int limit = appProperties.getKimi().getRateLimitPerMinute();
            log.warn("[Kimi/stream] Rate limit hit for user {}", user.getUsername());
            try {
                String errorJson = objectMapper.writeValueAsString(Map.of(
                    "error",      "rate_limit",
                    "message_en", "Rate limit reached — max " + limit + " requests/minute",
                    "message_zh", "请求超速，每分钟最多 " + limit + " 次，请稍后再试"
                ));
                emitter.send(SseEmitter.event().name("error").data(errorJson));
                emitter.complete();
            } catch (IOException ex) {
                emitter.completeWithError(ex);
            }
            return emitter;
        }

        // ── API key check ─────────────────────────────────────────────────────
        String apiKey = appProperties.getKimi().getApiKey();
        if (apiKey == null || apiKey.isEmpty()) {
            try {
                String errorJson = objectMapper.writeValueAsString(Map.of(
                    "error",      "no_api_key",
                    "message_en", "HUB Assist is not configured. Contact your administrator.",
                    "message_zh", "HUB 助手尚未配置，请联系管理员"
                ));
                emitter.send(SseEmitter.event().name("error").data(errorJson));
                emitter.complete();
            } catch (IOException ex) {
                emitter.completeWithError(ex);
            }
            return emitter;
        }

        // ── Stream from Moonshot in a virtual thread ───────────────────────────
        Thread.ofVirtual().start(() -> {
            try {
                ObjectNode body = objectMapper.valueToTree(requestBody);
                if (!body.has("model")) body.put("model", "moonshot-v1-8k");
                body.put("stream", true);

                HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();

                HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(appProperties.getKimi().getBaseUrl() + "/chat/completions"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(
                        objectMapper.writeValueAsString(body)
                    ))
                    .build();

                HttpResponse<java.util.stream.Stream<String>> response = client.send(
                    request, HttpResponse.BodyHandlers.ofLines()
                );

                if (response.statusCode() != 200) {
                    String errorJson = objectMapper.writeValueAsString(Map.of(
                        "error",      "upstream_error",
                        "message_en", "AI service returned error " + response.statusCode(),
                        "message_zh", "AI 服务返回错误 " + response.statusCode()
                    ));
                    emitter.send(SseEmitter.event().name("error").data(errorJson));
                    emitter.complete();
                    return;
                }

                response.body().forEach(line -> {
                    if (!line.startsWith("data: ")) return;
                    String data = line.substring(6).trim();
                    if ("[DONE]".equals(data)) {
                        emitter.complete();
                        return;
                    }
                    try {
                        emitter.send(SseEmitter.event().data(data));
                    } catch (IOException e) {
                        emitter.completeWithError(e);
                    }
                });

                emitter.complete();

            } catch (Exception e) {
                log.error("[Kimi/stream] Error for user {}: {}", user.getUsername(), e.getMessage());
                try {
                    String errorJson = objectMapper.writeValueAsString(Map.of(
                        "error",      "stream_error",
                        "message_en", "Connection interrupted. Please try again.",
                        "message_zh", "连接中断，请重试"
                    ));
                    emitter.send(SseEmitter.event().name("error").data(errorJson));
                } catch (IOException ignored) {}
                emitter.completeWithError(e);
            }
        });

        return emitter;
    }
}
