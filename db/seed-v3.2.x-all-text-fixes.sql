-- RAOSS Hub — consolidated text fixes (covers v3.2.1 + v3.2.2 seeds)
-- Run once with run-seed.bat → pick this file
-- Safe to run again: each statement is idempotent

-- ── Forgot password panel ─────────────────────────────────────────────────────

-- New key: label for email input field
INSERT INTO ui_messages (key, language_code, value) VALUES
  ('forgot_label_email', 'en', 'Email')
ON CONFLICT (key, language_code) DO NOTHING;

-- Update subtitle to say "email" not "username"
UPDATE ui_messages
SET value = 'Enter your email address to receive a reset link.'
WHERE key = 'forgot_subtitle' AND language_code = 'en';

-- Update placeholder to say "email"
UPDATE ui_messages
SET value = 'Enter your email address'
WHERE key = 'forgot_placeholder' AND language_code = 'en';

-- Update empty-field error to say "email"
UPDATE ui_messages
SET value = 'Please enter your email address.'
WHERE key = 'forgot_err_empty' AND language_code = 'en';

-- ── Login panel ───────────────────────────────────────────────────────────────

-- Update login label: "Username" → "Email"
UPDATE ui_messages
SET value = 'Email'
WHERE key = 'login_username' AND language_code = 'en';

-- Update login placeholder
UPDATE ui_messages
SET value = 'Enter your email address'
WHERE key = 'login_username_placeholder' AND language_code = 'en';

-- Insert if key not present (in case it was never seeded)
INSERT INTO ui_messages (key, language_code, value) VALUES
  ('login_username',             'en', 'Email'),
  ('login_username_placeholder', 'en', 'Enter your email address')
ON CONFLICT (key, language_code) DO NOTHING;
