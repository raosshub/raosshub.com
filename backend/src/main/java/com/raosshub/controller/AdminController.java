package com.raosshub.controller;

import com.raosshub.config.DataInitializer;
import com.raosshub.dto.ApiResponse;
import com.raosshub.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPERADMIN')")
public class AdminController {

    private final DataInitializer dataInitializer;

    /**
     * POST /api/admin/reseed
     *
     * Re-seeds all EN UI strings and ensures the admin user exists.
     * Called by the Initial Setup wizard (Flow 1) and the Language Migration
     * wizard (Flow 2) after factory reset.
     *
     * Optional body:
     *   {
     *     "username": "newadmin",   // replaces "admin"
     *     "password": "NewPass1!",  // replaces "RaossAdmin2024!"
     *     "email":    "admin@co.com" // replaces "admin@raoss.com"
     *   }
     *
     * If body is absent or any field is blank, the default value is used.
     * Idempotent — safe to call multiple times.
     */
    @PostMapping("/reseed")
    public ResponseEntity<ApiResponse<Void>> reseed(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody(required = false) Map<String, String> body) {

        String username = body != null ? body.get("username") : null;
        String password = body != null ? body.get("password") : null;
        String email    = body != null ? body.get("email")    : null;

        dataInitializer.ensureAdminUser(username, password, email);
        dataInitializer.seedEnUiMessages();

        log.info("[Admin] Reseed completed by {}", userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(null, "Reseeded successfully"));
    }
}
