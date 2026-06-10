package com.raosshub.service;

import com.raosshub.dto.ForgotPasswordRequest;
import com.raosshub.dto.LoginRequest;
import com.raosshub.dto.ResetPasswordRequest;
import com.raosshub.dto.UserDto;
import com.raosshub.entity.PasswordResetToken;
import com.raosshub.entity.User;
import com.raosshub.repository.NdaAgreementRepository;
import com.raosshub.repository.PasswordResetTokenRepository;
import com.raosshub.repository.UserRepository;
import com.raosshub.security.JwtTokenProvider;
import com.raosshub.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager      authenticationManager;
    private final JwtTokenProvider           tokenProvider;
    private final UserRepository             userRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final NdaAgreementRepository     ndaAgreementRepository;
    // ConfigService removed — was only used for forceOnVersionChange (deleted in v3.1.5)
    private final PasswordEncoder            passwordEncoder;
    private final AuditLogService            auditLogService;
    private final EmailService               emailService;   // ← added in v3.2.0

    /**
     * Internal token pair — never serialised to JSON.
     * Controller uses this to set the refresh token as an httpOnly cookie
     * and return only the access token to the client.
     */
    public record AuthTokens(String accessToken, String refreshToken, UserDto user) {}

    // ─── Login ────────────────────────────────────────────────────────────────

    @Transactional
    public AuthTokens login(LoginRequest request, String ipAddress) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    request.getUsername(),
                    request.getPassword()
                )
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

            User user = userRepository.findByUsername(userDetails.getUsername()).orElseThrow();
            user.setLastLogin(Instant.now());
            userRepository.save(user);

            // NDA is per-session — always clear acceptance on login.
            // Version-based enforcement removed (v3.1.5).
            ndaAgreementRepository.findByUserId(user.getId()).ifPresent(ndaAgreementRepository::delete);

            String accessToken  = tokenProvider.generateAccessToken(authentication);
            String refreshToken = tokenProvider.generateRefreshToken(authentication);

            auditLogService.log(userDetails.getUsername(), "login", "auth", user.getId(),
                "User logged in", ipAddress);

            return new AuthTokens(accessToken, refreshToken, toUserDto(userDetails));

        } catch (BadCredentialsException e) {
            throw new BadCredentialsException("Invalid credentials");
        }
    }

    // ─── Refresh ──────────────────────────────────────────────────────────────

    /**
     * Validates the refresh token from the httpOnly cookie, generates a fresh
     * access token and a new refresh token (rotation), and returns both.
     */
    @Transactional
    public AuthTokens refresh(String refreshToken) {
        if (!tokenProvider.validateToken(refreshToken) || !tokenProvider.isRefreshToken(refreshToken)) {
            throw new RuntimeException("Invalid or expired refresh token");
        }

        String username = tokenProvider.getUsernameFromToken(refreshToken);
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new RuntimeException("User account is inactive");
        }

        UserDetailsImpl userDetails = UserDetailsImpl.build(user);
        UsernamePasswordAuthenticationToken auth =
            new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

        String newAccessToken  = tokenProvider.generateAccessToken(auth);
        String newRefreshToken = tokenProvider.generateRefreshToken(auth);

        return new AuthTokens(newAccessToken, newRefreshToken, toUserDto(userDetails));
    }

    // ─── Current user ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public UserDto getCurrentUser(String username) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return toUserDto(UserDetailsImpl.build(user));
    }

    // ─── Password reset ───────────────────────────────────────────────────────

    /**
     * Generates a 1-hour password reset token and sends the reset email.
     *
     * Security: never reveals whether the username exists — the response is
     * identical for known and unknown users.
     *
     * @param request      contains username + lang (user's selected language)
     * @param frontendUrl  the base URL of the frontend (from Origin header),
     *                     used to build the reset link: {frontendUrl}/?reset={token}
     */
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request, String frontendUrl) {
        // Accept email or username — merge into a single assignment so the
        // variable is effectively final and usable inside the lambda below.
        User user = userRepository.findByUsername(request.getUsername())
            .or(() -> userRepository.findByEmail(request.getUsername()))
            .orElse(null);
        if (user == null) {
            log.info("[Auth] Password reset requested for unknown username/email: {}", request.getUsername());
            return;
        }

        // Invalidate any existing unused tokens for this user.
        // PasswordResetTokenRepository has findByToken() only — no findByUserId().
        resetTokenRepository.findAll().stream()
            .filter(t -> t.getUser().getId().equals(user.getId()) && !t.getUsed())
            .forEach(t -> {
                t.setUsed(true);
                resetTokenRepository.save(t);
            });

        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setUser(user);
        resetToken.setToken(UUID.randomUUID().toString());
        resetToken.setExpiresAt(Instant.now().plusSeconds(3600)); // 1 hour
        resetTokenRepository.save(resetToken);

        log.info("[Auth] Password reset token generated for user: {}", user.getUsername());

        // Send reset email (Option A: falls back to console log if SMTP absent)
        String lang = request.getLang() != null ? request.getLang() : "en";
        emailService.sendPasswordResetEmail(user, resetToken.getToken(), frontendUrl, lang);
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken token = resetTokenRepository.findByToken(request.getToken())
            .orElseThrow(() -> new RuntimeException("Invalid or expired reset token"));

        if (Boolean.TRUE.equals(token.getUsed()) || token.getExpiresAt().isBefore(Instant.now())) {
            throw new RuntimeException("Reset token has expired");
        }

        User user = token.getUser();
        // User entity field is passwordHash — Lombok generates setPasswordHash(), not setPassword()
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        userRepository.save(user);

        token.setUsed(true);
        resetTokenRepository.save(token);
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private UserDto toUserDto(UserDetailsImpl user) {
        return UserDto.builder()
            .id(user.getId())
            .username(user.getUsername())
            .email(user.getEmail())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .role(user.getRole())
            .teams(user.getTeams())
            .canViewActivity(user.isCanViewActivity())
            .build();
    }
}
