\encoding UTF8
-- =============================================================
-- RAOSS Hub v3 -- Comprehensive EN seed
-- All keys seeded EN only. Other languages via Kimi in Admin Setup.
-- Safe to run multiple times.
-- Run: run-seed.bat > pick this file
-- =============================================================

-- NDA badge
INSERT INTO ui_messages (key, language_code, value) VALUES
  ('nda_required', 'en', 'REQUIRED')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

-- Email reset keys (read by EmailService via I18nService)
-- {name} in email_reset_greeting is replaced with the user display name
INSERT INTO ui_messages (key, language_code, value) VALUES
  ('email_reset_subject',  'en', 'Password Reset')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('email_reset_title', 'en', 'Reset Your Password')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('email_reset_greeting', 'en', 'Hi {name},')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('email_reset_body', 'en', 'We received a request to reset your password. Click the button below to set a new password.')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('email_reset_btn', 'en', 'Reset Password')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('email_reset_expiry', 'en', 'This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

-- Login field labels
INSERT INTO ui_messages (key, language_code, value) VALUES
  ('login_username', 'en', 'Email')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('login_username_placeholder', 'en', 'Enter your email address')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

-- Forgot password panel
INSERT INTO ui_messages (key, language_code, value) VALUES
  ('forgot_label_email', 'en', 'Email')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('forgot_title', 'en', 'Reset Password')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('forgot_subtitle', 'en', 'Enter your email address to receive a reset link.')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('forgot_placeholder', 'en', 'Enter your email address')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('forgot_btn', 'en', 'Send Reset Link')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('forgot_back', 'en', 'Back to Sign In')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('forgot_success', 'en', 'If the account exists, a reset link has been sent to the registered email.')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('forgot_err_empty', 'en', 'Please enter your email address.')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

-- Reset password panel
INSERT INTO ui_messages (key, language_code, value) VALUES
  ('reset_title', 'en', 'Set New Password')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('reset_subtitle', 'en', 'Enter and confirm your new password.')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('reset_label_pwd', 'en', 'New Password')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('reset_label_confirm', 'en', 'Confirm Password')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('reset_placeholder_pwd', 'en', 'Min. 8 characters with letters and numbers')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('reset_placeholder_confirm', 'en', 'Repeat new password')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('reset_btn', 'en', 'Reset Password')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('reset_back', 'en', 'Back to Sign In')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('reset_success', 'en', 'Password updated. You can now sign in.')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('reset_err_empty', 'en', 'Please enter and confirm your new password.')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('reset_err_mismatch', 'en', 'Passwords do not match.')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('reset_err_weak', 'en', 'Password must be at least 8 characters with letters and numbers.')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('reset_err_expired', 'en', 'This reset link has expired or has already been used.')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

-- Language Translation tab -- section selection (v3.6.0)
INSERT INTO ui_messages (key, language_code, value) VALUES
  ('lt_selected', 'en', 'selected')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('lt_select_all', 'en', 'All')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('lt_select_none', 'en', 'None')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('lt_translate_selected', 'en', 'Translate Selected')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;
