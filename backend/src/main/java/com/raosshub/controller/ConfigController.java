package com.raosshub.controller;

import com.raosshub.dto.ApiResponse;
import com.raosshub.security.UserDetailsImpl;
import com.raosshub.service.ConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/config")
@RequiredArgsConstructor
public class ConfigController {

    private final ConfigService configService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Object>> getConfig() {
        return ResponseEntity.ok(ApiResponse.ok(configService.getConfig()));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<ApiResponse<Void>> saveConfig(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody Map<String, Object> config) {
        configService.saveConfig(config, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(null, "Configuration saved"));
    }
}
