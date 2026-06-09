package com.raosshub.controller;

import com.raosshub.dto.ApiResponse;
import com.raosshub.service.ConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.mail.MessagingException;
import java.net.InetAddress;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;

/**
 * SMTP connection test — POST /api/config/smtp/test
 *
 * Uses JavaMailSenderImpl.testConnection() (spring-boot-starter-mail).
 *
 * On "Permission denied (getsockopt)": outbound TCP to the SMTP port is
 * blocked by the OS firewall, SELinux, or corporate network policy.
 * No Java code change can bypass this — it is an environment issue.
 * In that case we fall back to a DNS check and return a clear message.
 *
 * Error categories returned to the UI:
 *   success: true  → port reachable
 *   success: false, message contains "firewall" → TCP blocked, DNS OK
 *   success: false, message contains "DNS"      → hostname not resolved
 *   success: false, message contains "Auth"     → wrong credentials
 *   success: false, other                       → SMTP protocol error
 */
@Slf4j
@RestController
@RequestMapping("/api/config")
@RequiredArgsConstructor
public class SmtpTestController {

    private final ConfigService configService;

    @PostMapping("/smtp/test")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> testSmtp(
            @RequestBody(required = false) Map<String, Object> body) {

        Map<String, Object> smtp = resolveSmtpConfig(body);

        String  host     = (String) smtp.getOrDefault("host",     "");
        int     port     = toInt(   smtp.getOrDefault("port",     587));
        String  username = (String) smtp.getOrDefault("username", "");
        String  password = (String) smtp.getOrDefault("password", "");
        boolean tls      = Boolean.TRUE.equals(smtp.get("tls"));

        if (host == null || host.isBlank()) {
            return respond(false, "SMTP host is not configured.", -1);
        }

        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(host);
        sender.setPort(port);

        boolean hasCredentials = username != null && !username.isBlank();
        if (hasCredentials) {
            sender.setUsername(username);
            sender.setPassword(password != null ? password : "");
        }

        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol",   "smtp");
        props.put("mail.smtp.connectiontimeout","5000");
        props.put("mail.smtp.timeout",          "5000");
        props.put("mail.smtp.writetimeout",     "5000");
        props.put("mail.smtp.auth",             hasCredentials ? "true" : "false");

        if (port == 465) {
            props.put("mail.smtp.ssl.enable",        "true");
            props.put("mail.smtp.ssl.trust",         "*");
        } else if (tls || port == 587) {
            props.put("mail.smtp.starttls.enable",   "true");
            props.put("mail.smtp.starttls.required", "false");
            props.put("mail.smtp.ssl.trust",         "*");
        }

        long start = System.currentTimeMillis();
        try {
            sender.testConnection();
            long elapsed = System.currentTimeMillis() - start;
            log.info("[SMTP Test] {}:{} reachable in {}ms", host, port, elapsed);
            return respond(true,
                "Connected to " + host + ":" + port + " (" + elapsed + "ms)", elapsed);

        } catch (MessagingException e) {
            long elapsed = System.currentTimeMillis() - start;
            String raw = e.getMessage() != null ? e.getMessage() : "Connection failed";
            log.warn("[SMTP Test] {}:{} — {}", host, port, raw);

            // ── Permission denied — OS/firewall blocking TCP ──────────────────
            if (raw.toLowerCase().contains("permission denied") ||
                raw.toLowerCase().contains("eacces")) {

                boolean dnsOk = resolvesDns(host);
                if (dnsOk) {
                    return respond(false,
                        "Outbound TCP to " + host + ":" + port +
                        " is blocked by a local firewall or network policy. " +
                        "The hostname resolves correctly. " +
                        "Allow the Java process outbound access on port " + port + ", " +
                        "then retest. Settings are saved and will work once the firewall allows it.",
                        elapsed);
                } else {
                    return respond(false,
                        "Outbound TCP blocked and DNS could not resolve '" + host +
                        "'. Check both the hostname and firewall settings.", elapsed);
                }
            }

            // ── Auth failure ──────────────────────────────────────────────────
            if (raw.contains("535") || raw.contains("534") ||
                raw.toLowerCase().contains("authentication") ||
                raw.toLowerCase().contains("credentials")) {
                return respond(false,
                    "Authentication failed for " + host + ":" + port +
                    ". Check username and password (use an App Password for Gmail).", elapsed);
            }

            // ── Host unreachable / refused ────────────────────────────────────
            if (raw.toLowerCase().contains("connection refused") ||
                raw.toLowerCase().contains("connect timed out") ||
                raw.toLowerCase().contains("no route to host")) {
                return respond(false,
                    "Cannot reach " + host + ":" + port +
                    ". Check the host and port, and ensure the server is running.", elapsed);
            }

            // ── DNS failure ───────────────────────────────────────────────────
            if (raw.toLowerCase().contains("unknownhost") ||
                raw.toLowerCase().contains("nodename nor servname")) {
                return respond(false,
                    "DNS: hostname '" + host + "' could not be resolved. Check the host spelling.", elapsed);
            }

            // ── Other ─────────────────────────────────────────────────────────
            // Strip nested exception noise for a cleaner UI message
            String clean = raw.contains(";") ? raw.substring(0, raw.indexOf(';')).trim() : raw;
            return respond(false, clean, elapsed);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Try to resolve the hostname via DNS — does not open a TCP connection. */
    private boolean resolvesDns(String host) {
        try {
            InetAddress.getByName(host);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> resolveSmtpConfig(Map<String, Object> body) {
        if (body != null && body.containsKey("smtp")) {
            Object o = body.get("smtp");
            if (o instanceof Map<?, ?>) return (Map<String, Object>) o;
        }
        Map<String, Object> cfg  = configService.getConfig();
        Map<String, Object> intg = safeMap(cfg.get("integrations"));
        return safeMap(intg.get("smtp"));
    }

    private ResponseEntity<ApiResponse<Map<String, Object>>> respond(
            boolean success, String message, long responseTimeMs) {
        Map<String, Object> data = new HashMap<>();
        data.put("success",        success);
        data.put("message",        message);
        data.put("responseTimeMs", responseTimeMs);
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> safeMap(Object o) {
        return (o instanceof Map<?, ?> m) ? (Map<String, Object>) m : new HashMap<>();
    }

    private int toInt(Object o) {
        if (o instanceof Number n) return n.intValue();
        try { return Integer.parseInt(String.valueOf(o)); }
        catch (NumberFormatException e) { return 587; }
    }
}
