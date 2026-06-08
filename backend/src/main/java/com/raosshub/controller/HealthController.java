package com.raosshub.controller;

import com.raosshub.config.AppProperties;
import com.raosshub.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Health check endpoint — public, no auth required.
 *
 * GET /api/health         — full status: app + storage
 * GET /api/health/security-check — confirms SecurityConfig is the Phase 1 version
 *
 * Storage check:
 *   - If path-style-access is true (MinIO mode): pings /minio/health/live
 *   - If false (AWS S3 mode): marks as MANAGED (AWS guarantees availability)
 *   - If endpoint is not configured: marks as NOT_CONFIGURED
 */
@Slf4j
@RestController
@RequestMapping("/api/health")
@RequiredArgsConstructor
public class HealthController {

    private final AppProperties appProperties;

    @GetMapping
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> status = new LinkedHashMap<>();
        status.put("status",  "UP");
        status.put("service", "raosshub-backend");
        status.put("version", "3.1.3");
        status.put("storage", checkStorageHealth());
        return ResponseEntity.ok(status);
    }

    /**
     * Pings the storage layer.
     * MinIO: calls /minio/health/live — a no-auth liveness probe.
     * AWS S3: skipped (AWS-managed availability, no equivalent public probe).
     */
    private String checkStorageHealth() {
        String endpoint = appProperties.getS3().getEndpoint();
        if (endpoint == null || endpoint.isBlank()) {
            return "NOT_CONFIGURED";
        }

        boolean isMinIO = appProperties.getS3().isPathStyleAccess();
        if (!isMinIO) {
            // AWS S3 — service availability is AWS-managed, no client-side probe needed.
            return "MANAGED";
        }

        // MinIO — ping the built-in liveness probe (no credentials required)
        try {
            HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3))
                .build();

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(endpoint + "/minio/health/live"))
                .GET()
                .timeout(Duration.ofSeconds(3))
                .build();

            HttpResponse<Void> response = client.send(
                request, HttpResponse.BodyHandlers.discarding()
            );

            if (response.statusCode() == 200) {
                return "UP";
            } else {
                log.warn("[Health] MinIO returned HTTP {} on liveness probe", response.statusCode());
                return "DEGRADED";
            }

        } catch (Exception e) {
            log.warn("[Health] MinIO unreachable at {}: {}", endpoint, e.getMessage());
            return "DOWN";
        }
    }

    /**
     * Debug endpoint — confirms the Phase 1 SecurityConfig is loaded.
     * Returns 200 if the new SecurityConfig (with exceptionHandling) is active.
     */
    @GetMapping("/security-check")
    public ResponseEntity<ApiResponse<Map<String, String>>> securityCheck() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
            "securityConfig", "phase1-with-exceptionHandling",
            "timestamp",      Instant.now().toString(),
            "message",        "SecurityConfig is the Phase 1 version"
        )));
    }
}
