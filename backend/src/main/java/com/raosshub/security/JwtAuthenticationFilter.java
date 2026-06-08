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
 * JWT authentication filter.
 *
 * shouldNotFilter() must exactly mirror the permitAll() paths in SecurityConfig.
 * Using startsWith() for paths that have protected sub-paths causes the filter to
 * skip JWT processing for those sub-paths, leaving SecurityContext empty.
 * Spring Security then fires the 401 AuthenticationEntryPoint even when a valid
 * token was sent.
 *
 * Rules:
 *   /api/languages          — public (exact match only)
 *   /api/languages/**       — requires auth (Tab 2 management endpoints)
 *   /api/ui-strings         — public
 *   /api/ui-strings/**      — public
 *   /api/locales/**         — requires auth (NDA-gated locale content)
 *   All other paths         — JWT processed
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

        // Public auth endpoints — no JWT needed
        if (path.equals("/api/auth/login"))          return true;
        if (path.equals("/api/auth/refresh"))        return true;
        if (path.equals("/api/auth/forgot-password")) return true;
        if (path.equals("/api/auth/reset-password")) return true;

        // Health check
        if (path.equals("/api/health"))              return true;
        if (path.startsWith("/api/health/"))         return true;

        // Language list — public, exact path only.
        // /api/languages/all, /api/languages/{id}, /api/languages/{id}/default
        // all require auth and must NOT be skipped here.
        if (path.equals("/api/languages"))           return true;

        // UI strings — fully public (login screen needs these before auth)
        if (path.equals("/api/ui-strings"))          return true;
        if (path.startsWith("/api/ui-strings/"))     return true;

        // Public file serve (logos, images, favicons, 3D models)
        if (path.startsWith("/api/files/serve"))     return true;

        // All other paths — including /api/languages/**, /api/locales/**,
        // /api/kimi/**, /api/config, /api/users/**, etc. — go through JWT filter.
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
