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

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final NdaAgreementRepository ndaAgreementRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

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

            // Clear NDA acceptance — forces re-acceptance on every login
            ndaAgreementRepository.findByUserId(user.getId())
                .ifPresent(ndaAgreementRepository::delete);

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
     * The controller sets the new refresh token as a cookie and returns only
     * the access token to the client.
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

        // Rotate: issue new access + refresh tokens on every refresh call
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

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findByUsername(request.getUsername()).orElse(null);

        if (user == null) {
            // Do not reveal whether the account exists
            log.info("[Auth] Password reset requested for unknown user: {}", request.getUsername());
            return;
        }

        // Invalidate any existing unused tokens for this user.
        // PasswordResetTokenRepository has findByToken() only — no findByUserId().
        // Use findAll + stream to locate tokens belonging to this user.
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
