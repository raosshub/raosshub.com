package com.raosshub.service;

import com.raosshub.dto.ForgotPasswordRequest;
import com.raosshub.dto.LoginRequest;
import com.raosshub.dto.ResetPasswordRequest;
import com.raosshub.dto.UserDto;
import com.raosshub.entity.PasswordResetToken;
import com.raosshub.entity.User;
import com.raosshub.repository.NdaAgreementRepository;
import com.raosshub.repository.PasswordResetTokenRepository;
import com.raosshub.repository.ProjectConfigRepository;
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
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager        authenticationManager;
    private final JwtTokenProvider             tokenProvider;
    private final UserRepository               userRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final NdaAgreementRepository       ndaAgreementRepository;
    private final ProjectConfigRepository      projectConfigRepository;  // for NDA showMode check
    // ConfigService removed — was only used for forceOnVersionChange (deleted in v3.1.5)
    private final PasswordEncoder              passwordEncoder;
    private final AuditLogService              auditLogService;
    private final EmailService                 emailService;             // added in v3.2.0

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

            // Clear NDA acceptance on login — UNLESS showMode is 'once'.
            // For 'once' mode the permanent acceptance record must be preserved
            // so GET /api/auth/nda/accepted returns true on subsequent logins,
            // allowing App.tsx to skip the agreement modal silently.
            // For 'every_login' mode (default) the record is always cleared,
            // which is the original v3 session-based behaviour.
            if (!isNdaOnceMode()) {
                ndaAgreementRepository.findByUserId(user.getId())
                    .ifPresent(ndaAgreementRepository::delete);
            }

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

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request, String frontendUrl) {
        User user = userRepository.findByUsername(request.getUsername())
            .or(() -> userRepository.findByEmail(request.getUsername()))
            .orElse(null);
        if (user == null) {
            log.info("[Auth] Password reset requested for unknown username/email: {}", request.getUsername());
            return;
        }

        resetTokenRepository.findAll().stream()
            .filter(t -> t.getUser().getId().equals(user.getId()) && !t.getUsed())
            .forEach(t -> {
                t.setUsed(true);
                resetTokenRepository.save(t);
            });

        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setUser(user);
        resetToken.setToken(UUID.randomUUID().toString());
        resetToken.setExpiresAt(Instant.now().plusSeconds(3600));
        resetTokenRepository.save(resetToken);

        log.info("[Auth] Password reset token generated for user: {}", user.getUsername());

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
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        userRepository.save(user);

        token.setUsed(true);
        resetTokenRepository.save(token);
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    /**
     * Returns true when config.nda.showMode is "once".
     *
     * Called in login() to decide whether to clear the nda_agreements record.
     * Any exception (missing table, null config, unexpected JSONB shape) returns
     * false so the safe default — always show the agreement — is preserved.
     */
    @SuppressWarnings("unchecked")
    private boolean isNdaOnceMode() {
        try {
            return projectConfigRepository.findFirstByOrderByIdAsc()
                .map(cfg -> {
                    Object raw = cfg.getConfig();
                    if (!(raw instanceof Map)) return false;
                    Object nda = ((Map<?, ?>) raw).get("nda");
                    if (!(nda instanceof Map)) return false;
                    return "once".equals(((Map<?, ?>) nda).get("showMode"));
                })
                .orElse(false);
        } catch (Exception e) {
            log.debug("[Auth] NDA mode check failed, defaulting to every_login: {}", e.getMessage());
            return false;
        }
    }

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
