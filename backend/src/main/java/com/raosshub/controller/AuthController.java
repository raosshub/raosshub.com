package com.raosshub.controller;

import com.raosshub.dto.*;
import com.raosshub.entity.NdaAgreement;
import com.raosshub.entity.User;
import com.raosshub.repository.NdaAgreementRepository;
import com.raosshub.security.JwtTokenProvider;
import com.raosshub.security.UserDetailsImpl;
import com.raosshub.service.AuthService;
import com.raosshub.service.AuditLogService;
import com.raosshub.service.ConfigService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService            authService;
    private final AuditLogService        auditLogService;
    private final NdaAgreementRepository ndaAgreementRepository;
    private final ConfigService          configService;
    private final JwtTokenProvider       tokenProvider;
    private final UserDetailsService     userDetailsService;

    // ── Login ─────────────────────────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthService.AuthTokens>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        AuthService.AuthTokens response = authService.login(request, getClientIp(httpRequest));
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    // ── Current user ─────────────────────────────────────────────────────────
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UserDto>> getCurrentUser(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(ApiResponse.ok(authService.getCurrentUser(userDetails.getUsername())));
    }

    // ── Refresh token ─────────────────────────────────────────────────────────
    // Accepts the refresh token from the httpOnly cookie (hub_refresh).
    // Falls back to the Authorization header for clients that pass it there.
    // Validates the token and issues a new access token.
    // Returns only { accessToken } — the frontend only reads this field.
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<Map<String, String>>> refreshToken(
            @CookieValue(name = "hub_refresh", required = false) String refreshCookie,
            @RequestHeader(name = "Authorization", required = false) String authHeader) {

        // Determine which token to validate
        String token = refreshCookie;
        if (token == null && authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        }
        if (token == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Refresh token required"));
        }

        try {
            if (!tokenProvider.validateToken(token) || !tokenProvider.isRefreshToken(token)) {
                return ResponseEntity.status(401).body(ApiResponse.error("Invalid or expired refresh token"));
            }
            String username = tokenProvider.getUsernameFromToken(token);
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            Authentication auth = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities()
            );
            String newAccessToken = tokenProvider.generateAccessToken(auth);
            return ResponseEntity.ok(ApiResponse.ok(Map.of("accessToken", newAccessToken)));
        } catch (Exception e) {
            log.warn("[Auth] Refresh failed: {}", e.getMessage());
            return ResponseEntity.status(401).body(ApiResponse.error("Refresh token invalid"));
        }
    }

    // ── Password reset ────────────────────────────────────────────────────────
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.ok(null, "If the account exists, a reset link has been sent"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.ok(null, "Password updated successfully"));
    }

    // ── NDA: accept ──────────────────────────────────────────────────────────
    // Upserts the nda_agreements row — updates accepted_version on each acceptance.
    @PostMapping("/nda")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> acceptNda(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            HttpServletRequest httpRequest) {

        NdaAgreement nda = ndaAgreementRepository.findByUserId(userDetails.getId())
            .orElseGet(() -> {
                NdaAgreement n = new NdaAgreement();
                User u = new User();
                u.setId(userDetails.getId());
                n.setUser(u);
                return n;
            });

        nda.setAcceptedVersion(currentProjectVersion());
        nda.setIpAddress(getClientIp(httpRequest));
        nda.setUserAgent(httpRequest.getHeader("User-Agent"));
        ndaAgreementRepository.save(nda);

        auditLogService.log(userDetails.getUsername(), "accept", "auth", userDetails.getId(),
            "NDA accepted (v" + (currentProjectVersion() != null ? currentProjectVersion() : "?") + ")",
            getClientIp(httpRequest));

        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ── NDA: status ───────────────────────────────────────────────────────────
    // When config.nda.forceOnVersionChange = true: returns false if the project
    // version changed since the user last accepted — causes the NDA modal to
    // re-appear without forcing a logout.
    @GetMapping("/nda/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Boolean>> getNdaStatus(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        boolean exists = ndaAgreementRepository.existsByUserId(userDetails.getId());
        if (!exists) return ResponseEntity.ok(ApiResponse.ok(false));

        if (isVersionEnforcementOn()) {
            String currentVersion = currentProjectVersion();
            NdaAgreement nda = ndaAgreementRepository.findByUserId(userDetails.getId()).orElse(null);
            if (nda == null) return ResponseEntity.ok(ApiResponse.ok(false));
            if (currentVersion != null && !currentVersion.isEmpty()) {
                return ResponseEntity.ok(ApiResponse.ok(currentVersion.equals(nda.getAcceptedVersion())));
            }
        }

        return ResponseEntity.ok(ApiResponse.ok(true));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private boolean isVersionEnforcementOn() {
        try {
            Object ndaCfg = configService.getConfig().get("nda");
            if (ndaCfg instanceof Map<?, ?> m) {
                return Boolean.TRUE.equals(((Map<String, Object>) m).get("forceOnVersionChange"));
            }
        } catch (Exception ignored) {}
        return false;
    }

    @SuppressWarnings("unchecked")
    private String currentProjectVersion() {
        try {
            Object id = configService.getConfig().get("identity");
            if (id instanceof Map<?, ?> m) {
                Object v = ((Map<String, Object>) m).get("version");
                return v != null ? v.toString() : null;
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String getClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        return xf != null ? xf.split(",")[0] : request.getRemoteAddr();
    }
}
