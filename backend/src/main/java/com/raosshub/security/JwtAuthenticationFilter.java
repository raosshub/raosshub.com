package com.raosshub.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * JWT authentication filter. Processes Bearer tokens on incoming requests.
 * shouldNotFilter() must EXACTLY MATCH the permitAll() paths in SecurityConfig.
 * This ensures public endpoints skip JWT processing, while all others
 * (including /api/auth/me, /api/auth/nda) get authenticated.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final UserDetailsServiceImpl userDetailsService;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();

        // CORS preflight — never filter
        if ("OPTIONS".equalsIgnoreCase(method)) return true;

        // Public auth endpoints — no JWT needed
        if (path.equals("/api/auth/login")) return true;
        if (path.equals("/api/auth/refresh")) return true;
        if (path.equals("/api/auth/forgot-password")) return true;
        if (path.equals("/api/auth/reset-password")) return true;

        // Health check
        if (path.equals("/api/health")) return true;

        // I18n / locale (read-only public)
        if (path.startsWith("/api/languages")) return true;
        if (path.startsWith("/api/ui-strings")) return true;
        if (path.startsWith("/api/locales")) return true;

        // Public file serve (images, models, logos, favicons)
        if (path.startsWith("/api/files/serve")) return true;

        // All other paths go through JWT filter
        return false;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt) && !tokenProvider.isRefreshToken(jwt)) {
                String username = tokenProvider.getUsernameFromToken(jwt);
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception e) {
            log.error("Cannot set user authentication: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
