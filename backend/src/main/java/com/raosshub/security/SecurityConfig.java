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
 * CORS origins are read from app.cors.allowed-origins in application.yml.
 * Override via APP_CORS_ALLOWED_ORIGINS env var in production — no code change needed.
 *
 * /api/locales/** requires authentication — locale content is confidential project
 * data protected by NDA. Only /api/ui-strings stays public (login screen labels).
 *
 * AuthenticationEntryPoint returns 401 (not Spring's default 403) so the Axios 401
 * interceptor can trigger silent token refresh correctly when access tokens expire.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final UserDetailsServiceImpl userDetailsService;
    private final AppProperties appProperties;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(securityCorsSource()))
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exceptions -> exceptions
                // Return 401 for unauthenticated requests so the Axios interceptor
                // fires correctly. Spring Security 6 defaults to 403 without this.
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    response.getWriter().write(
                        "{\"success\":false,\"message\":\"Authentication required\"}"
                    );
                })
            )
            .authorizeHttpRequests(auth -> auth
                // CORS preflight — never block
                .requestMatchers(new AntPathRequestMatcher("/**", HttpMethod.OPTIONS.name())).permitAll()
                // Public auth endpoints
                .requestMatchers(
                    new AntPathRequestMatcher("/api/auth/login"),
                    new AntPathRequestMatcher("/api/auth/refresh"),
                    new AntPathRequestMatcher("/api/auth/logout"),
                    new AntPathRequestMatcher("/api/auth/forgot-password"),
                    new AntPathRequestMatcher("/api/auth/reset-password")
                ).permitAll()
                // Health
                .requestMatchers(new AntPathRequestMatcher("/api/health")).permitAll()
                // Public file serve (images, 3D models, logos, favicons)
                .requestMatchers(new AntPathRequestMatcher("/api/files/serve/**")).permitAll()
                // i18n — only UI strings and language list are public
                .requestMatchers(new AntPathRequestMatcher("/api/languages")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/languages/**")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/ui-strings")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/ui-strings/**")).permitAll()
                // NOTE: /api/locales/** is intentionally NOT listed here — requires auth.
                // Error page
                .requestMatchers(new AntPathRequestMatcher("/error")).permitAll()
                // Everything else requires a valid access token
                .anyRequest().authenticated()
            )
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource securityCorsSource() {
        CorsConfiguration config = new CorsConfiguration();

        // Read from app.cors.allowed-origins — comma-separated string.
        // Set via APP_CORS_ALLOWED_ORIGINS env var in production.
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
