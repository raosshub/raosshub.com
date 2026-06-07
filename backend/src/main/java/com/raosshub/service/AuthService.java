package com.raosshub.service;

import com.raosshub.dto.*;
import com.raosshub.entity.PasswordResetToken;
import com.raosshub.entity.User;
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
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    @Transactional
    public LoginResponse login(LoginRequest request, String ipAddress) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    request.getUsername(),
                    request.getPassword()
                )
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

            // Update last login
            User user = userRepository.findByUsername(userDetails.getUsername()).orElseThrow();
            user.setLastLogin(Instant.now());
            userRepository.save(user);

            String accessToken = tokenProvider.generateAccessToken(authentication);

            auditLogService.log(userDetails.getUsername(), "login", "auth", user.getId(),
                "User logged in", ipAddress);

            return LoginResponse.builder()
                .accessToken(accessToken)
                .tokenType("Bearer")
                .user(toUserDto(userDetails))
                .build();

        } catch (BadCredentialsException e) {
            throw new BadCredentialsException("Invalid credentials");
        }
    }

    @Transactional(readOnly = true)
    public UserDto getCurrentUser(String username) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return toUserDto(UserDetailsImpl.build(user));
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
            .orElse(null);

        if (user == null) {
            // Don't reveal if user exists
            log.info("Password reset requested for non-existent user: {}", request.getUsername());
            return;
        }

        // Invalidate old tokens
        resetTokenRepository.findAll().stream()
            .filter(t -> t.getUser().getId().equals(user.getId()) && !t.getUsed())
            .forEach(t -> { t.setUsed(true); resetTokenRepository.save(t); });

        String token = UUID.randomUUID().toString();
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setUser(user);
        resetToken.setToken(token);
        resetToken.setExpiresAt(Instant.now().plusSeconds(3600)); // 1 hour
        resetTokenRepository.save(resetToken);

        // TODO: Send email with reset link
        log.info("Password reset token generated for user: {} (token: {})", user.getUsername(), token);
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken token = resetTokenRepository.findByToken(request.getToken())
            .orElseThrow(() -> new RuntimeException("Invalid or expired token"));

        if (token.getUsed() || token.getExpiresAt().isBefore(Instant.now())) {
            throw new RuntimeException("Token expired");
        }

        User user = token.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        userRepository.save(user);

        token.setUsed(true);
        resetTokenRepository.save(token);
    }

    @Transactional
    public LoginResponse refreshToken(String refreshToken) {
        if (!tokenProvider.validateToken(refreshToken) || !tokenProvider.isRefreshToken(refreshToken)) {
            throw new RuntimeException("Invalid refresh token");
        }

        String username = tokenProvider.getUsernameFromToken(refreshToken);
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new RuntimeException("User is inactive");
        }

        UserDetailsImpl userDetails = UserDetailsImpl.build(user);
        UsernamePasswordAuthenticationToken auth =
            new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

        String newAccessToken = tokenProvider.generateAccessToken(auth);

        return LoginResponse.builder()
            .accessToken(newAccessToken)
            .tokenType("Bearer")
            .user(toUserDto(userDetails))
            .build();
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
