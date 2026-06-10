-- ═══════════════════════════════════════════════════════════════
-- RAOSS Hub v3 — Comprehensive EN seed
-- Covers: nda_required, email_reset_*, forgot_*, reset_*,
--         login_username, login_username_placeholder, forgot_label_email
--
-- All EN keys only. Other languages → Admin Setup → Language → Kimi.
-- Safe to run multiple times (ON CONFLICT DO NOTHING for inserts,
-- DO UPDATE for corrections).
-- Run with run-seed.bat → pick this file.
-- ═══════════════════════════════════════════════════════════════

-- ── NDA badge ──────────────────────────────────────────────────────────────
INSERT INTO ui_messages (key, language_code, value) VALUES
  ('nda_required', 'en', 'REQUIRED')
ON CONFLICT (key, language_code) DO NOTHING;

-- ── Email reset keys (read by EmailService via I18nService) ────────────────
-- {name} in email_reset_greeting is substituted with the user's display name.
INSERT INTO ui_messages (key, language_code, value) VALUES
  ('email_reset_subject',  'en', 'Password Reset'),
  ('email_reset_title',    'en', 'Reset Your Password'),
  ('email_reset_greeting', 'en', 'Hi {name},'),
  ('email_reset_body',     'en', 'We received a request to reset your password. Click the button below to set a new password.'),
  ('email_reset_btn',      'en', 'Reset Password →'),
  ('email_reset_expiry',   'en', 'This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.')
ON CONFLICT (key, language_code) DO NOTHING;

-- ── Login field labels (changed from username to email) ────────────────────
-- INSERT + UPDATE pattern: insert if missing, then update value in all cases.
INSERT INTO ui_messages (key, language_code, value) VALUES
  ('login_username',             'en', 'Email'),
  ('login_username_placeholder', 'en', 'Enter your email address')
ON CONFLICT (key, language_code) DO NOTHING;

UPDATE ui_messages SET value = 'Email'
  WHERE key = 'login_username' AND language_code = 'en';
UPDATE ui_messages SET value = 'Enter your email address'
  WHERE key = 'login_username_placeholder' AND language_code = 'en';

-- ── Forgot password panel ──────────────────────────────────────────────────
INSERT INTO ui_messages (key, language_code, value) VALUES
  ('forgot_label_email',  'en', 'Email'),
  ('forgot_title',        'en', 'Reset Password'),
  ('forgot_subtitle',     'en', 'Enter your email address to receive a reset link.'),
  ('forgot_placeholder',  'en', 'Enter your email address'),
  ('forgot_btn',          'en', 'Send Reset Link'),
  ('forgot_back',         'en', '← Back to Sign In'),
  ('forgot_success',      'en', 'If the account exists, a reset link has been sent to the registered email.'),
  ('forgot_err_empty',    'en', 'Please enter your email address.')
ON CONFLICT (key, language_code) DO NOTHING;

UPDATE ui_messages SET value = 'Enter your email address to receive a reset link.'
  WHERE key = 'forgot_subtitle' AND language_code = 'en';
UPDATE ui_messages SET value = 'Enter your email address'
  WHERE key = 'forgot_placeholder' AND language_code = 'en';
UPDATE ui_messages SET value = 'Please enter your email address.'
  WHERE key = 'forgot_err_empty' AND language_code = 'en';

-- ── Reset password panel ───────────────────────────────────────────────────
INSERT INTO ui_messages (key, language_code, value) VALUES
  ('reset_title',              'en', 'Set New Password'),
  ('reset_subtitle',           'en', 'Enter and confirm your new password.'),
  ('reset_label_pwd',          'en', 'New Password'),
  ('reset_label_confirm',      'en', 'Confirm Password'),
  ('reset_placeholder_pwd',    'en', 'Min. 8 characters with letters and numbers'),
  ('reset_placeholder_confirm','en', 'Repeat new password'),
  ('reset_btn',                'en', 'Reset Password'),
  ('reset_back',               'en', '← Back to Sign In'),
  ('reset_success',            'en', 'Password updated. You can now sign in.'),
  ('reset_err_empty',          'en', 'Please enter and confirm your new password.'),
  ('reset_err_mismatch',       'en', 'Passwords do not match.'),
  ('reset_err_weak',           'en', 'Password must be at least 8 characters with letters and numbers.'),
  ('reset_err_expired',        'en', 'This reset link has expired or has already been used.')
ON CONFLICT (key, language_code) DO NOTHING;
