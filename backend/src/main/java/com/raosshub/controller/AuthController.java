package com.raosshub.controller;

import com.raosshub.dto.*;
import com.raosshub.repository.NdaAgreementRepository;
import com.raosshub.repository.UserRepository;
import com.raosshub.security.UserDetailsImpl;
import com.raosshub.service.AuthService;
import com.raosshub.service.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final AuditLogService auditLogService;
    private final NdaAgreementRepository ndaAgreementRepository;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        String ip = getClientIp(httpRequest);
        LoginResponse response = authService.login(request, ip);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UserDto>> getCurrentUser(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        UserDto user = authService.getCurrentUser(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(user));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<LoginResponse>> refreshToken(
            @RequestHeader("Authorization") String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(ApiResponse.error("Refresh token required"));
        }
        String refreshToken = authHeader.substring(7);
        LoginResponse response = authService.refreshToken(refreshToken);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

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

    @PostMapping("/nda")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> acceptNda(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            HttpServletRequest httpRequest) {
        // NDA acceptance tracked in DB
        if (!ndaAgreementRepository.existsByUserId(userDetails.getId())) {
            com.raosshub.entity.NdaAgreement nda = new com.raosshub.entity.NdaAgreement();
            com.raosshub.entity.User user = new com.raosshub.entity.User();
            user.setId(userDetails.getId());
            nda.setUser(user);
            nda.setIpAddress(getClientIp(httpRequest));
            ndaAgreementRepository.save(nda);
        }
        auditLogService.log(userDetails.getUsername(), "accept", "auth", userDetails.getId(),
            "NDA accepted", getClientIp(httpRequest));
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @GetMapping("/nda/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Boolean>> getNdaStatus(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        boolean accepted = ndaAgreementRepository.existsByUserId(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.ok(accepted));
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }
}
