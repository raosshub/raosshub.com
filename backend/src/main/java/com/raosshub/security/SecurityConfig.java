package com.raosshub.security;

import com.raosshub.config.AppProperties;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Single security filter chain.
 *
 * Public paths (no token required):
 *   - /api/auth/** — login, refresh, logout, forgot/reset password
 *   - /api/health — liveness check
 *   - GET /api/languages — active language list (exact path only; management sub-paths require auth)
 *   - /api/ui-strings, /api/ui-strings/** — UI label strings for login screen
 *   - /api/files/serve/** — public file serving (logos, images)
 *
 * /api/languages/** (all sub-paths) is intentionally NOT public.
 * Language management endpoints require authentication + SUPERADMIN role,
 * enforced by @PreAuthorize on the controller methods.
 *
 * /api/locales/** requires authentication — locale content is confidential
 * project data protected by NDA.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final UserDetailsServiceImpl  userDetailsService;
    private final AppProperties           appProperties;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(securityCorsSource()))
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    response.getWriter().write(
                        "{\"success\":false,\"message\":\"Authentication required\"}"
                    );
                })
            )
            .authorizeHttpRequests(auth -> auth
                // CORS preflight
                .requestMatchers(
                    new AntPathRequestMatcher("/**", HttpMethod.OPTIONS.name())
                ).permitAll()

                // Auth
                .requestMatchers(
                    new AntPathRequestMatcher("/api/auth/login"),
                    new AntPathRequestMatcher("/api/auth/refresh"),
                    new AntPathRequestMatcher("/api/auth/logout"),
                    new AntPathRequestMatcher("/api/auth/forgot-password"),
                    new AntPathRequestMatcher("/api/auth/reset-password")
                ).permitAll()

                // Health
                .requestMatchers(new AntPathRequestMatcher("/api/health")).permitAll()

                // Files — public serve
                .requestMatchers(new AntPathRequestMatcher("/api/files/serve/**")).permitAll()

                // i18n — public:
                //   GET /api/languages         — active language list (exact only)
                //   /api/ui-strings/**         — UI label strings
                // NOT public:
                //   /api/languages/**          — language management (superadmin via @PreAuthorize)
                //   /api/locales/**            — locale content (NDA-gated, requires auth)
                .requestMatchers(new AntPathRequestMatcher("/api/languages")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/ui-strings")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/ui-strings/**")).permitAll()

                // Error page
                .requestMatchers(new AntPathRequestMatcher("/error")).permitAll()

                // Everything else requires a valid JWT access token
                .anyRequest().authenticated()
            )
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource securityCorsSource() {
        CorsConfiguration config = new CorsConfiguration();

        List<String> origins = Arrays.stream(
                appProperties.getCors().getAllowedOrigins().split(",")
            )
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .collect(Collectors.toList());

        config.setAllowedOrigins(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
