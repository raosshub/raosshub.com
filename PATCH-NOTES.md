# RAOSS Hub — Patch v3.2.0
**Date:** 2026-06-10
**Feature:** Forgot / Reset Password

---

## What This Adds

### User flow (matches v2 reference)
1. Login screen → "Forgot password?" link → forgot panel
2. Enter username → Send → always shows success (never reveals if account exists)
3. Backend: generates 1-hour reset token, sends email (or logs URL if SMTP absent)
4. User clicks email link → base URL loads with `?reset=TOKEN`
5. LoginScreen detects token → shows reset panel automatically
6. Enter new password + confirm → validate → submit
7. Success → auto-returns to login after 2.5s

Password validation (matches v2): min 8 chars, at least 1 letter, at least 1 number, must match.

### Language
The user's selected language (`currentLang`) is:
- Applied to all panel text via `t()` — changes instantly when user switches language
- Passed to `POST /auth/forgot-password` as `lang` → email sent in that language
- Email supports EN and ZH (other languages fall back to EN)

### Email (dark theme)
- Background: #0d1117, accent: #3fb950, card: #161b22
- Table-based HTML for email-client compatibility
- Inline dark styles — no external CSS
- Project name from Admin Setup → Tab 1 identity
- CTA button + plain-text URL fallback
- EN and ZH content hardcoded in EmailService

### Local environment (Option A)
When SMTP is not configured in Admin Setup → Tab 7 (Integrations):
- Reset URL is logged to backend console at INFO level
- Copy the URL from console to test locally
- API response is identical either way

```
[Auth] Password reset link for 'admin': http://localhost:5173/?reset=abc123-...
[Email] SMTP not configured — reset link logged above.
```

---

## Files Changed

### New backend file
```
backend/src/main/java/com/raosshub/service/EmailService.java
```

### Modified backend files
```
backend/src/main/java/com/raosshub/service/AuthService.java
  → EmailService injected
  → forgotPassword() accepts frontendUrl, calls emailService

backend/src/main/java/com/raosshub/controller/AuthController.java
  → forgotPassword() extracts Origin header → frontendUrl → passes to service
```

### Modified frontend file
```
frontend/src/components/LoginScreen.tsx
  → Three views: login / forgot / reset
  → URL ?reset=TOKEN detection on mount, token cleared from history
  → currentLang passed to forgotPassword API call
  → backdropOnly prop preserved (no autocomplete in nda stage)
```

### DB seed (run immediately)
```
db/seed-forgot-password-keys.sql    ← run with run-seed.ps1
```

---

## How to Apply

### 1. Extract zip into project root

### 2. Add 20 keys to DataInitializer.java (Rule 8 — must be in DataInitializer for fresh installs)

Open: `backend/src/main/java/com/raosshub/config/DataInitializer.java`

Find the line:
```java
en("login_err_network",   "Connection error. Please try again.");
```

Add AFTER that line:
```java
// ── Forgot / Reset Password ──────────────────────────────────────────────
en("forgot_title",             "Reset Password");
en("forgot_subtitle",          "Enter your username to receive a reset link.");
en("forgot_placeholder",       "Enter your username");
en("forgot_btn",               "Send Reset Link");
en("forgot_back",              "← Back to Sign In");
en("forgot_success",           "If the account exists, a reset link has been sent to the registered email.");
en("forgot_err_empty",         "Please enter your username.");
en("reset_title",              "Set New Password");
en("reset_subtitle",           "Enter and confirm your new password.");
en("reset_label_pwd",          "New Password");
en("reset_label_confirm",      "Confirm Password");
en("reset_placeholder_pwd",    "Min. 8 characters with letters and numbers");
en("reset_placeholder_confirm","Repeat new password");
en("reset_btn",                "Reset Password");
en("reset_back",               "← Back to Sign In");
en("reset_success",            "Password updated. You can now sign in.");
en("reset_err_empty",          "Please enter and confirm your new password.");
en("reset_err_mismatch",       "Passwords do not match.");
en("reset_err_weak",           "Password must be at least 8 characters with letters and numbers.");
en("reset_err_expired",        "This reset link has expired or has already been used.");
```

### 3. Seed the DB immediately
```powershell
$env:PGPASSWORD="raoss_dev_2024"
psql -U raoss -d raosshub -h 127.0.0.1 -p 5432 -f "db\seed-forgot-password-keys.sql"
```

### 4. Restart backend (recompile — new EmailService)
```bash
cd backend && mvn spring-boot:run
```

### 5. Restart frontend
```bash
cd frontend && npm run dev
```

---

## Testing without SMTP (local dev)

1. Go to login screen → click "Forgot password?"
2. Enter your username (e.g. "admin") → Send Reset Link
3. Check backend console for the reset URL:
   ```
   [Auth] Password reset link for 'admin': http://localhost:5173/?reset=abc123-uuid
   ```
4. Copy the URL and open in browser
5. Reset password panel appears automatically
6. Enter new password → Reset

---

## SMTP configuration (production)

Admin Setup → Tab 7 (Integrations) → SMTP section:
- Host, Port, Username, Password, From Email, From Name, TLS toggle
- Test Connection button — confirms SMTP is reachable before saving
- After saving, forgot password emails will be sent automatically

---

## Remaining tasks
- Confirm this works → git tag v3.2.0
- Next features/bugs
