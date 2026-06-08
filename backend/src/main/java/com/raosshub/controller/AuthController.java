package com.raosshub.controller;

import com.raosshub.config.AppProperties;
import com.raosshub.dto.ApiResponse;
import com.raosshub.dto.ForgotPasswordRequest;
import com.raosshub.dto.LoginRequest;
import com.raosshub.dto.LoginResponse;
import com.raosshub.dto.ResetPasswordRequest;
import com.raosshub.dto.UserDto;
import com.raosshub.repository.NdaAgreementRepository;
import com.raosshub.security.UserDetailsImpl;
import com.raosshub.service.AuthService;
import com.raosshub.service.AuthService.AuthTokens;
import com.raosshub.service.AuditLogService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    // Cookie name — scoped to /api/auth so it is only sent to auth endpoints
    private static final String REFRESH_COOKIE_NAME = "hub_refresh";

    private final AuthService authService;
    private final AuditLogService auditLogService;
    private final NdaAgreementRepository ndaAgreementRepository;
    private final AppProperties appProperties;

    // ─── Login ────────────────────────────────────────────────────────────────

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        String ip = getClientIp(httpRequest);
        AuthTokens tokens = authService.login(request, ip);

        // Refresh token lives in an httpOnly cookie — never exposed to JS
        setRefreshCookie(httpResponse, tokens.refreshToken());

        // Only the access token is returned in the JSON body
        LoginResponse body = LoginResponse.builder()
            .accessToken(tokens.accessToken())
            .tokenType("Bearer")
            .user(tokens.user())
            .build();

        return ResponseEntity.ok(ApiResponse.ok(body));
    }

    // ─── Current user ─────────────────────────────────────────────────────────

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UserDto>> getCurrentUser(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        UserDto user = authService.getCurrentUser(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(user));
    }

    // ─── Refresh ──────────────────────────────────────────────────────────────
    // Public endpoint — no access token required.
    // The refresh token arrives via the httpOnly cookie automatically.
    // On success: issues new access token in JSON + rotates the refresh cookie.

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<LoginResponse>> refresh(
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        String refreshToken = getRefreshTokenFromCookie(httpRequest);
        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.status(401)
                .body(ApiResponse.error("Refresh token not found"));
        }

        try {
            AuthTokens tokens = authService.refresh(refreshToken);

            // Rotate: replace the old cookie with the new refresh token
            setRefreshCookie(httpResponse, tokens.refreshToken());

            LoginResponse body = LoginResponse.builder()
                .accessToken(tokens.accessToken())
                .tokenType("Bearer")
                .user(tokens.user())
                .build();

            return ResponseEntity.ok(ApiResponse.ok(body));

        } catch (RuntimeException e) {
            // Invalid or expired refresh token — clear the stale cookie
            clearRefreshCookie(httpResponse);
            return ResponseEntity.status(401)
                .body(ApiResponse.error("Session expired, please log in again"));
        }
    }

    // ─── Logout ───────────────────────────────────────────────────────────────
    // Authenticated — access token required. If access token is expired, the
    // Axios 401 interceptor on the frontend silently refreshes it first, then
    // retries this logout call. The cookie is then cleared correctly.

    @PostMapping("/logout")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> logout(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        clearRefreshCookie(httpResponse);

        auditLogService.log(
            userDetails.getUsername(), "logout", "auth", userDetails.getId(),
            "User logged out", getClientIp(httpRequest)
        );

        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ─── Password reset ───────────────────────────────────────────────────────

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(
            ApiResponse.ok(null, "If the account exists, a reset link has been sent")
        );
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.ok(null, "Password updated successfully"));
    }

    // ─── NDA ──────────────────────────────────────────────────────────────────

    @PostMapping("/nda")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> acceptNda(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            HttpServletRequest httpRequest) {

        if (!ndaAgreementRepository.existsByUserId(userDetails.getId())) {
            com.raosshub.entity.NdaAgreement nda = new com.raosshub.entity.NdaAgreement();
            com.raosshub.entity.User user = new com.raosshub.entity.User();
            user.setId(userDetails.getId());
            nda.setUser(user);
            nda.setIpAddress(getClientIp(httpRequest));
            ndaAgreementRepository.save(nda);
        }

        auditLogService.log(
            userDetails.getUsername(), "accept", "auth", userDetails.getId(),
            "NDA accepted", getClientIp(httpRequest)
        );

        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @GetMapping("/nda/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Boolean>> getNdaStatus(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        boolean accepted = ndaAgreementRepository.existsByUserId(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.ok(accepted));
    }

    // ─── Cookie helpers ───────────────────────────────────────────────────────

    /**
     * Sets the refresh token as an httpOnly, SameSite=Strict cookie scoped
     * to /api/auth so the browser only sends it to auth endpoints.
     * Max-Age is derived from the same config value used to sign the token.
     */
    private void setRefreshCookie(HttpServletResponse response, String refreshToken) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, refreshToken)
            .httpOnly(true)
            .secure(appProperties.getJwt().isCookieSecure())
            .path("/api/auth")
            .maxAge(appProperties.getJwt().getRefreshExpirationMs() / 1000L)
            .sameSite("Strict")
            .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    /**
     * Clears the refresh cookie by overwriting it with an empty value
     * and Max-Age=0. The browser deletes it immediately.
     */
    private void clearRefreshCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, "")
            .httpOnly(true)
            .secure(appProperties.getJwt().isCookieSecure())
            .path("/api/auth")
            .maxAge(0)
            .sameSite("Strict")
            .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    /**
     * Reads the refresh token from the incoming cookies.
     * Returns null if the cookie is absent.
     */
    private String getRefreshTokenFromCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
            .filter(c -> REFRESH_COOKIE_NAME.equals(c.getName()))
            .map(Cookie::getValue)
            .findFirst()
            .orElse(null);
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null) return request.getRemoteAddr();
        return xfHeader.split(",")[0].trim();
    }
}
