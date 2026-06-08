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
 * JWT authentication filter. Extracts and validates Bearer tokens on every request.
 *
 * shouldNotFilter() must EXACTLY match the permitAll() paths in SecurityConfig.
 * Any path listed here bypasses JWT processing — keep this list minimal.
 *
 * /api/locales/** is intentionally NOT in the skip list. Locale content is
 * confidential project data and requires a valid access token.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final UserDetailsServiceImpl userDetailsService;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path   = request.getRequestURI();
        String method = request.getMethod();

        // CORS preflight — never filter
        if ("OPTIONS".equalsIgnoreCase(method)) return true;

        // Public auth endpoints
        if (path.equals("/api/auth/login"))           return true;
        if (path.equals("/api/auth/refresh"))         return true;
        if (path.equals("/api/auth/forgot-password")) return true;
        if (path.equals("/api/auth/reset-password"))  return true;
        // /api/auth/logout is authenticated (@PreAuthorize) — DO NOT skip;
        // the filter must process it so Spring Security resolves the principal.

        // Health check
        if (path.equals("/api/health")) return true;

        // i18n — only UI strings and language list are public
        if (path.startsWith("/api/languages"))  return true;
        if (path.startsWith("/api/ui-strings")) return true;
        // NOTE: /api/locales is intentionally NOT here — requires auth

        // Public file serve (images, 3D models, logos, favicons)
        if (path.startsWith("/api/files/serve")) return true;

        // Everything else goes through JWT validation
        return false;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt)
                    && tokenProvider.validateToken(jwt)
                    && !tokenProvider.isRefreshToken(jwt)) {

                String username = tokenProvider.getUsernameFromToken(jwt);
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities()
                    );
                authentication.setDetails(
                    new WebAuthenticationDetailsSource().buildDetails(request)
                );
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
