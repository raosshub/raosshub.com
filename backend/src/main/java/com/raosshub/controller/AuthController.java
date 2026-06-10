package com.raosshub.controller;

import com.raosshub.config.AppProperties;
import com.raosshub.dto.*;
import com.raosshub.entity.NdaAgreement;
import com.raosshub.entity.User;
import com.raosshub.repository.NdaAgreementRepository;
import com.raosshub.security.JwtTokenProvider;
import com.raosshub.security.UserDetailsImpl;
import com.raosshub.service.AuthService;
import com.raosshub.service.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService            authService;
    private final AuditLogService        auditLogService;
    private final NdaAgreementRepository ndaAgreementRepository;
    // ConfigService removed — was only used for forceOnVersionChange logic
    private final JwtTokenProvider       tokenProvider;
    private final UserDetailsService     userDetailsService;
    private final AppProperties          appProperties;

    // ── Login ──────────────────────────────────────────────────────────────────
    // Sets hub_refresh as httpOnly cookie so Axios can silently refresh the
    // 15-minute access token. Returns only { accessToken, user }.
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Map<String, Object>>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {

        AuthService.AuthTokens tokens = authService.login(request, getClientIp(httpRequest));

        ResponseCookie refreshCookie = ResponseCookie
            .from("hub_refresh", tokens.refreshToken())
            .httpOnly(true)
            .secure(appProperties.getJwt().isCookieSecure())
            .sameSite("Strict")
            .path("/api/auth")
            .maxAge(Duration.ofMillis(appProperties.getJwt().getRefreshExpirationMs()))
            .build();

        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
            .body(ApiResponse.ok(Map.of(
                "accessToken", tokens.accessToken(),
                "user",        tokens.user()
            )));
    }

    // ── Logout ────────────────────────────────────────────────────────────────
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout() {
        ResponseCookie clearCookie = ResponseCookie
            .from("hub_refresh", "")
            .httpOnly(true)
            .secure(appProperties.getJwt().isCookieSecure())
            .sameSite("Strict")
            .path("/api/auth")
            .maxAge(0)
            .build();

        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, clearCookie.toString())
            .body(ApiResponse.ok(null));
    }

    // ── Current user ──────────────────────────────────────────────────────────
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UserDto>> getCurrentUser(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(ApiResponse.ok(
            authService.getCurrentUser(userDetails.getUsername())
        ));
    }

    // ── Refresh token ─────────────────────────────────────────────────────────
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<Map<String, String>>> refreshToken(
            @CookieValue(name = "hub_refresh", required = false) String refreshCookie,
            @RequestHeader(name = "Authorization", required = false) String authHeader) {

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
            String      username    = tokenProvider.getUsernameFromToken(token);
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            Authentication auth     = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities()
            );
            String newAccessToken = tokenProvider.generateAccessToken(auth);
            return ResponseEntity.ok(ApiResponse.ok(Map.of("accessToken", newAccessToken)));

        } catch (Exception e) {
            log.warn("[Auth] Refresh failed: {}", e.getMessage());
            return ResponseEntity.status(401).body(ApiResponse.error("Refresh token invalid"));
        }
    }

    // ── Forgot / reset password ───────────────────────────────────────────────
    // Both endpoints are public (no auth required) — SecurityConfig permits them.
    //
    // forgotPassword: extracts the frontend base URL from the Origin header so
    // EmailService can build the correct reset link (e.g. http://localhost:5173
    // in dev, https://raosshub.com in production). Falls back to localhost:5173
    // when Origin is absent (e.g. Postman, curl).
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request,
            HttpServletRequest httpRequest) {
        String origin      = httpRequest.getHeader("Origin");
        String frontendUrl = (origin != null && !origin.isBlank())
            ? origin : "http://localhost:5173";
        authService.forgotPassword(request, frontendUrl);
        return ResponseEntity.ok(ApiResponse.ok(null,
            "If the account exists, a reset link has been sent"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.ok(null, "Password updated successfully"));
    }

    // ── NDA: accept ───────────────────────────────────────────────────────────
    // Upserts the nda_agreements row.
    // acceptedVersion is no longer set — version enforcement is removed.
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

        nda.setIpAddress(getClientIp(httpRequest));
        nda.setUserAgent(httpRequest.getHeader("User-Agent"));
        ndaAgreementRepository.save(nda);

        auditLogService.log(
            userDetails.getUsername(), "accept", "auth", userDetails.getId(),
            "NDA accepted", getClientIp(httpRequest)
        );

        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ── NDA: status ───────────────────────────────────────────────────────────
    // NDA is per-session — login service deletes the record on every login.
    // Status is simply: does a record exist for this user?
    //   false = no record (login deleted it)   → NDA modal shows
    //   true  = record exists (same session)   → NDA modal hidden
    //
    // Version-based enforcement removed. forceOnVersionChange toggle in
    // Admin Setup Tab 6 no longer has any effect on the backend.
    @GetMapping("/nda/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Boolean>> getNdaStatus(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        boolean accepted = ndaAgreementRepository.existsByUserId(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.ok(accepted));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String getClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        return xf != null ? xf.split(",")[0] : request.getRemoteAddr();
    }
}
