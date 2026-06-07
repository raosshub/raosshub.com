package com.raosshub.controller;

import com.raosshub.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    @GetMapping
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "service", "raosshub-backend",
            "version", "3.1.0"
        ));
    }

    /**
     * Debug endpoint to verify security config is loaded correctly.
     * If this returns 200, public paths are working.
     * If this returns 403, the SecurityConfig is NOT the new one.
     */
    @GetMapping("/security-check")
    public ResponseEntity<ApiResponse<Map<String, String>>> securityCheck() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
            "securityConfig", "new-permitAll-pattern",
            "timestamp", Instant.now().toString(),
            "message", "If you see this, the new SecurityConfig is loaded"
        )));
    }
}
