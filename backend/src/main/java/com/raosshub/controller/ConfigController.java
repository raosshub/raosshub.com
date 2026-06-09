package com.raosshub.controller;

import com.raosshub.dto.ApiResponse;
import com.raosshub.security.UserDetailsImpl;
import com.raosshub.service.ConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/config")
@RequiredArgsConstructor
public class ConfigController {

    private final ConfigService configService;

    // ─── Config read/write ────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getConfig() {
        return ResponseEntity.ok(ApiResponse.ok(configService.getConfig()));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<ApiResponse<Void>> saveConfig(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody Map<String, Object> config) {
        try {
            configService.saveConfig(config, userDetails.getUsername());
            return ResponseEntity.ok(ApiResponse.ok(null, "Configuration saved"));
        } catch (Exception e) {
            log.error("Config save failed: {}", e.getMessage());
            return ResponseEntity.status(500).body(ApiResponse.error("Save failed: " + e.getMessage()));
        }
    }

    // ─── Danger Zone ──────────────────────────────────────────────────────────

    /**
     * Option 1 — Reset Data.
     * Clears locale_content only. Frontend must send { "confirm": "RESET" }.
     */
    @PostMapping("/reset-data")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<ApiResponse<Void>> resetData(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody Map<String, String> body) {

        if (!"RESET".equals(body.get("confirm"))) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Invalid confirmation token"));
        }
        try {
            configService.resetData();
            log.warn("[DangerZone] Reset Data initiated by {}", userDetails.getUsername());
            return ResponseEntity.ok(ApiResponse.ok(null, "Locale content cleared"));
        } catch (Exception e) {
            log.error("Reset data failed: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(ApiResponse.error("Reset failed: " + e.getMessage()));
        }
    }

    /**
     * Option 2 — Factory Reset.
     * Clears all content and configuration. Keeps only superadmin user accounts.
     * Frontend must send { "confirm": "FACTORY RESET" }.
     * This is a two-step operation on the frontend (confirm dialog + typed token).
     */
    @PostMapping("/factory-reset")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<ApiResponse<Void>> factoryReset(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody Map<String, String> body) {

        if (!"FACTORY RESET".equals(body.get("confirm"))) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Invalid confirmation token"));
        }
        try {
            configService.factoryReset();
            log.warn("[DangerZone] FACTORY RESET initiated by {}", userDetails.getUsername());
            return ResponseEntity.ok(ApiResponse.ok(null, "Factory reset complete — superadmin accounts preserved"));
        } catch (Exception e) {
            log.error("Factory reset failed: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(ApiResponse.error("Factory reset failed: " + e.getMessage()));
        }
    }
}
