package com.raosshub.service;

import com.raosshub.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.time.Year;
import java.util.Map;
import java.util.Properties;

/**
 * Sends transactional emails (password reset) using SMTP config
 * stored in project_configs.config.integrations.smtp.
 *
 * Option A fallback: when SMTP is not configured or the send fails,
 * the full reset URL is logged at INFO level so developers can copy
 * it from the backend console during local testing. The API response
 * to the frontend is always the same generic message — the fallback
 * is transparent to the user.
 *
 * Email theme: dark (#0d1117 background, #3fb950 accent) matching the
 * application UI, with inline styles for maximum email-client support.
 * Content language is driven by the lang field in ForgotPasswordRequest.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final ConfigService configService;

    // ── Password reset email ──────────────────────────────────────────────────

    /**
     * Sends the password reset email to the user's registered email address.
     * Falls back to console logging when SMTP is not configured.
     *
     * @param user        the User whose password needs resetting
     * @param resetToken  the UUID reset token (1-hour expiry)
     * @param frontendUrl the frontend base URL (from Origin header)
     * @param lang        the user's selected language ('en', 'zh', …)
     */
    public void sendPasswordResetEmail(User user, String resetToken,
                                       String frontendUrl, String lang) {

        String resetUrl = frontendUrl + "/?reset=" + resetToken;

        // Always log the reset URL — essential for local dev (Option A fallback)
        // and useful for production debugging. The token is one-time use and
        // expires in 1 hour, so logging it does not create a persistent risk.
        log.info("[Auth] Password reset link for '{}': {}", user.getUsername(), resetUrl);

        JavaMailSenderImpl sender = buildMailSender();
        if (sender == null) {
            log.info("[Email] SMTP not configured — reset link logged above. " +
                     "Configure SMTP in Admin Setup → Integrations to enable email delivery.");
            return;
        }

        // Read project identity for personalised subject and footer
        String projectName  = getIdentityField("projectName",  "RAOSS Hub");
        String companyName  = getIdentityField("companyName",  "RAOSS HK COMPANY LIMITED");
        // IntegrationsTab saves as 'fromAddress' — must match exactly
        String fromEmail    = getSmtpField("fromAddress", sender.getUsername());
        // No separate fromName field in IntegrationsTab — use project name
        String fromName     = projectName;

        String displayName = (user.getFirstName() != null && !user.getFirstName().isBlank())
            ? user.getFirstName() : user.getUsername();

        boolean isZh = "zh".equalsIgnoreCase(lang);

        String subject = isZh
            ? "密码重置 — " + projectName
            : "Password Reset — " + projectName;

        String html = buildHtml(displayName, resetUrl, projectName,
                                companyName, isZh, Year.now().getValue());

        try {
            MimeMessage msg = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromEmail, fromName);
            helper.setTo(user.getEmail());
            helper.setSubject(subject);
            helper.setText(html, true); // true = isHtml
            sender.send(msg);
            log.info("[Email] Password reset email sent to '{}'", user.getEmail());
        } catch (MessagingException | UnsupportedOperationException e) {
            log.warn("[Email] Failed to send password reset email to '{}': {} — " +
                     "reset link is still valid, see log above.",
                     user.getEmail(), e.getMessage());
        } catch (Exception e) {
            log.warn("[Email] Unexpected send error for '{}': {} — " +
                     "reset link is still valid, see log above.",
                     user.getEmail(), e.getMessage());
        }
    }

    // ── SMTP builder ──────────────────────────────────────────────────────────

    /** Returns a configured JavaMailSenderImpl, or null when SMTP is absent. */
    @SuppressWarnings("unchecked")
    private JavaMailSenderImpl buildMailSender() {
        try {
            Map<String, Object> cfg    = configService.getConfig();
            Object              intObj = cfg.get("integrations");
            // Separate instanceof check from cast — pattern-match Map<?,?> binds a
            // captured wildcard which prevents getOrDefault(key, concreteValue).
            // ConfigService returns Jackson-deserialized JSONB: keys are always String,
            // values always Object, so the unchecked cast is safe.
            if (!(intObj instanceof Map<?,?>)) return null;
            Map<String, Object> ints   = (Map<String, Object>) intObj;
            Object              smtpObj = ints.get("smtp");
            if (!(smtpObj instanceof Map<?,?>)) return null;
            Map<String, Object> smtp   = (Map<String, Object>) smtpObj;

            String host = (String) smtp.getOrDefault("host", "");
            if (host == null || host.isBlank()) return null;

            int     port     = toInt(smtp.getOrDefault("port", 587));
            String  username = (String) smtp.getOrDefault("username", "");
            String  password = (String) smtp.getOrDefault("password", "");
            boolean tls      = Boolean.TRUE.equals(smtp.get("tls"));

            JavaMailSenderImpl sender = new JavaMailSenderImpl();
            sender.setHost(host);
            sender.setPort(port);

            boolean hasAuth = username != null && !username.isBlank();
            if (hasAuth) {
                sender.setUsername(username);
                sender.setPassword(password != null ? password : "");
            }

            Properties props = sender.getJavaMailProperties();
            props.put("mail.transport.protocol", "smtp");
            props.put("mail.smtp.auth",           hasAuth ? "true" : "false");
            props.put("mail.smtp.connectiontimeout", "8000");
            props.put("mail.smtp.timeout",           "8000");
            props.put("mail.smtp.writetimeout",      "8000");

            if (port == 465) {
                props.put("mail.smtp.ssl.enable",  "true");
                props.put("mail.smtp.ssl.trust",   "*");
            } else if (tls || port == 587) {
                props.put("mail.smtp.starttls.enable",   "true");
                props.put("mail.smtp.starttls.required", "false");
                props.put("mail.smtp.ssl.trust",         "*");
            }

            return sender;
        } catch (Exception e) {
            log.warn("[Email] Could not build SMTP sender: {}", e.getMessage());
            return null;
        }
    }

    // ── Config helpers ────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private String getSmtpField(String field, String fallback) {
        try {
            Map<String, Object> cfg  = configService.getConfig();
            Object ints = cfg.get("integrations");
            if (!(ints instanceof Map<?,?> im)) return fallback;
            Object smtp = im.get("smtp");
            if (!(smtp instanceof Map<?,?> sm)) return fallback;
            Object v = sm.get(field);
            return (v != null && !v.toString().isBlank()) ? v.toString() : fallback;
        } catch (Exception e) { return fallback; }
    }

    @SuppressWarnings("unchecked")
    private String getIdentityField(String field, String fallback) {
        try {
            Map<String, Object> cfg = configService.getConfig();
            Object id = cfg.get("identity");
            if (!(id instanceof Map<?,?> idm)) return fallback;
            Object v = idm.get(field);
            return (v != null && !v.toString().isBlank()) ? v.toString() : fallback;
        } catch (Exception e) { return fallback; }
    }

    private static int toInt(Object v) {
        if (v instanceof Number n) return n.intValue();
        try { return Integer.parseInt(v.toString()); } catch (Exception e) { return 587; }
    }

    // ── HTML email template ───────────────────────────────────────────────────
    // Dark theme (#0d1117 base, #3fb950 accent) with inline styles.
    // Table-based layout for maximum email-client compatibility.

    private static String buildHtml(String displayName, String resetUrl,
                                    String projectName, String companyName,
                                    boolean isZh, int year) {

        String title   = isZh ? "重置您的密码"                  : "Reset Your Password";
        String greeting= isZh ? "您好 " + displayName + "，"   : "Hi " + displayName + ",";
        String body    = isZh
            ? "我们收到了重置您账号密码的请求。点击下方按钮设置新密码。"
            : "We received a request to reset your password. Click the button below to set a new password.";
        String btnText = isZh ? "重置密码 →"                   : "Reset Password →";
        String expiry  = isZh
            ? "此链接将在 <strong style=\"color:#e6edf3\">1小时</strong> 后失效。"
            + "如果您没有申请重置密码，请忽略此邮件，您的账号不会受到影响。"
            : "This link expires in <strong style=\"color:#e6edf3\">1 hour</strong>."
            + " If you did not request a password reset, you can safely ignore this email — your account remains unchanged.";
        String footer  = "&copy; " + year + " " + esc(companyName);

        return "<!DOCTYPE html>" +
            "<html lang=\"" + (isZh ? "zh" : "en") + "\">" +
            "<head>" +
            "<meta charset=\"UTF-8\">" +
            "<meta name=\"color-scheme\" content=\"dark\">" +
            "<meta name=\"supported-color-schemes\" content=\"dark\">" +
            "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
            "<title>" + esc(title) + "</title>" +
            "</head>" +
            "<body style=\"margin:0;padding:0;background:#0d1117;" +
            "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;\">" +

            // Outer table
            "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"" +
            " style=\"background:#0d1117;min-height:100vh;\">" +
            "<tr><td align=\"center\" style=\"padding:48px 20px 40px;\">" +

            // Inner narrow table
            "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"" +
            " style=\"max-width:560px;\">" +

            // ── Logo / project name ──
            "<tr><td align=\"center\" style=\"padding-bottom:28px;\">" +
            "<div style=\"font-size:22px;font-weight:700;color:#e6edf3;" +
            "letter-spacing:-0.3px;\">" + esc(projectName) +
            "<span style=\"color:#3fb950;\"> &bull;</span></div>" +
            "</td></tr>" +

            // ── Card ──
            "<tr><td style=\"background:#161b22;border:1px solid #30363d;" +
            "border-radius:12px;padding:36px 40px;\">" +

            // Title
            "<h1 style=\"margin:0 0 8px;font-size:20px;font-weight:700;" +
            "color:#e6edf3;line-height:1.3;\">" + esc(title) + "</h1>" +

            // Greeting + body
            "<p style=\"margin:0 0 24px;font-size:14px;line-height:1.75;" +
            "color:#8b949e;\">" + esc(greeting) + "<br><br>" + esc(body) + "</p>" +

            // CTA button (table trick for reliable rendering)
            "<table cellpadding=\"0\" cellspacing=\"0\" border=\"0\"" +
            " style=\"margin-bottom:28px;\">" +
            "<tr><td style=\"background:#3fb950;border-radius:8px;" +
            "mso-padding-alt:0;\">" +
            "<a href=\"" + resetUrl + "\"" +
            " style=\"display:inline-block;padding:13px 26px;" +
            "font-size:14px;font-weight:600;color:#0d1117;" +
            "text-decoration:none;letter-spacing:0.2px;\">" +
            esc(btnText) + "</a></td></tr></table>" +

            // Expiry / security note
            "<p style=\"margin:0 0 18px;font-size:12px;line-height:1.7;" +
            "color:#8b949e;\">" + expiry + "</p>" +

            // Fallback plain-text URL
            "<p style=\"margin:0;font-size:11px;color:#407755;" +
            "word-break:break-all;\">" + esc(resetUrl) + "</p>" +

            "</td></tr>" +

            // Footer
            "<tr><td align=\"center\"" +
            " style=\"padding-top:20px;font-size:11px;color:#407755;\">" +
            footer + "</td></tr>" +

            "</table>" + // inner
            "</td></tr></table>" + // outer
            "</body></html>";
    }

    /** Minimal HTML escaping — prevents XSS in generated email content. */
    private static String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
