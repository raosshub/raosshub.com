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
 * shouldNotFilter() must precisely mirror the truly-public paths in SecurityConfig.
 * Critical rule: if a path has BOTH a public read (GET) and a protected write (POST/PUT/PATCH),
 * the skip must be method-scoped — not a blanket path skip.
 *
 * Failing to scope by method causes the filter to skip JWT processing for POST requests,
 * leaving SecurityContext empty, which makes @PreAuthorize fail with 401 even when a
 * valid token was sent. This is the root cause of "POST /api/ui-strings → 401".
 *
 * Rules:
 *   GET  /api/languages       — public  (active language list for login screen)
 *   POST /api/languages       — JWT required  (create language, SUPERADMIN)
 *   PUT  /api/languages/{id}  — JWT required  (update language, SUPERADMIN)
 *
 *   GET  /api/ui-strings      — public  (UI label strings for login screen)
 *   POST /api/ui-strings      — JWT required  (save translated UI strings, ADMIN+)
 *
 *   /api/locales/**           — JWT required  (NDA-gated locale content)
 *   /api/files/serve/**       — public  (product images, logos, favicons)
 *   All other paths           — JWT required
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider       tokenProvider;
    private final UserDetailsServiceImpl userDetailsService;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        final String path   = request.getRequestURI();
        final String method = request.getMethod();

        // CORS preflight — never filter
        if ("OPTIONS".equalsIgnoreCase(method)) return true;

        // Public auth endpoints — no JWT needed
        if (path.equals("/api/auth/login"))           return true;
        if (path.equals("/api/auth/refresh"))         return true;
        if (path.equals("/api/auth/forgot-password")) return true;
        if (path.equals("/api/auth/reset-password"))  return true;

        // Health check
        if (path.equals("/api/health"))               return true;
        if (path.startsWith("/api/health/"))          return true;

        // Language list — GET only is public (active languages for login screen dropdown).
        // POST /api/languages (create), PUT /api/languages/{id} (update),
        // PATCH /api/languages/{id}/default — all require SUPERADMIN → must process JWT.
        if ("GET".equalsIgnoreCase(method) && path.equals("/api/languages")) return true;

        // UI strings — GET only is public (login screen needs labels before auth).
        // POST /api/ui-strings saves translated strings → requires ADMIN/SUPERADMIN → must process JWT.
        if ("GET".equalsIgnoreCase(method) && path.equals("/api/ui-strings"))       return true;
        if ("GET".equalsIgnoreCase(method) && path.startsWith("/api/ui-strings/"))  return true;

        // Public file serve (logos, images, favicons, 3D models)
        if (path.startsWith("/api/files/serve"))      return true;

        // All other paths — including /api/languages/**, /api/ui-strings POST,
        // /api/locales/**, /api/config, /api/users/**, /api/kimi, etc. — process JWT.
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

                String username   = tokenProvider.getUsernameFromToken(jwt);
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
