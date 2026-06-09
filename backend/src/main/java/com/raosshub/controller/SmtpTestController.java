package com.raosshub.controller;

import com.raosshub.dto.ApiResponse;
import com.raosshub.service.ConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.HashMap;
import java.util.Map;

/**
 * SMTP connection test.
 *
 * Uses a plain TCP socket connection — no JavaMail dependency needed.
 * Tests that the SMTP server is reachable and accepting connections on the
 * configured port. Does NOT send an email or authenticate.
 *
 * Endpoint: POST /api/config/smtp/test
 * Response: { success: boolean, message: string, responseTimeMs: long }
 */
@Slf4j
@RestController
@RequestMapping("/api/config")
@RequiredArgsConstructor
public class SmtpTestController {

    private final ConfigService configService;

    private static final int TIMEOUT_MS = 5_000;

    @PostMapping("/smtp/test")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> testSmtp() {

        // Read SMTP config from the stored project_configs JSONB
        Map<String, Object> cfg  = configService.getConfig();
        Map<String, Object> intg = safeMap(cfg.get("integrations"));
        Map<String, Object> smtp = safeMap(intg.get("smtp"));

        String host = (String) smtp.getOrDefault("host", "");
        int    port = toInt(smtp.getOrDefault("port", 587));

        if (host == null || host.isBlank()) {
            return ok(false, "SMTP host is not configured.", -1);
        }

        long start = System.currentTimeMillis();
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), TIMEOUT_MS);
            long elapsed = System.currentTimeMillis() - start;
            log.info("[SMTP Test] Connected to {}:{} in {}ms", host, port, elapsed);
            return ok(true, "Connected to " + host + ":" + port, elapsed);
        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - start;
            log.warn("[SMTP Test] Failed to connect to {}:{} — {}", host, port, e.getMessage());
            return ok(false, e.getMessage(), elapsed);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private ResponseEntity<ApiResponse<Map<String, Object>>> ok(
            boolean success, String message, long responseTimeMs) {
        Map<String, Object> data = new HashMap<>();
        data.put("success",       success);
        data.put("message",       message);
        data.put("responseTimeMs", responseTimeMs);
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> safeMap(Object o) {
        return (o instanceof Map<?, ?> m)
            ? (Map<String, Object>) m
            : new HashMap<>();
    }

    private int toInt(Object o) {
        if (o instanceof Number n) return n.intValue();
        try { return Integer.parseInt(String.valueOf(o)); } catch (NumberFormatException e) { return 587; }
    }
}
