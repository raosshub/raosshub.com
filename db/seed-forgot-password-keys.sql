-- ═══════════════════════════════════════════════════════════════
-- RAOSS Hub v3 — Forgot / Reset Password UI string seed
-- Patch v3.2.0
--
-- Seeds 18 new EN keys used by the forgot-password and reset-password
-- panels in LoginScreen. Kimi translation (Admin Setup → Language)
-- will pick these up for other languages automatically.
--
-- Run once: $env:PGPASSWORD="raoss_dev_2024"; psql -U raoss -d raosshub -h 127.0.0.1 -f this-file.sql
-- Safe to run multiple times: ON CONFLICT DO NOTHING
-- ALSO add these to DataInitializer.java — see PATCH-NOTES.md
-- ═══════════════════════════════════════════════════════════════

INSERT INTO ui_messages (key, language_code, value) VALUES

  -- Forgot password panel
  ('forgot_title',    'en', 'Reset Password'),
  ('forgot_subtitle', 'en', 'Enter your username to receive a reset link.'),
  ('forgot_placeholder','en','Enter your username'),
  ('forgot_btn',      'en', 'Send Reset Link'),
  ('forgot_back',     'en', '← Back to Sign In'),
  ('forgot_success',  'en', 'If the account exists, a reset link has been sent to the registered email.'),
  ('forgot_err_empty','en', 'Please enter your username.'),

  -- Reset password panel
  ('reset_title',             'en', 'Set New Password'),
  ('reset_subtitle',          'en', 'Enter and confirm your new password.'),
  ('reset_label_pwd',         'en', 'New Password'),
  ('reset_label_confirm',     'en', 'Confirm Password'),
  ('reset_placeholder_pwd',   'en', 'Min. 8 characters with letters and numbers'),
  ('reset_placeholder_confirm','en','Repeat new password'),
  ('reset_btn',               'en', 'Reset Password'),
  ('reset_back',              'en', '← Back to Sign In'),
  ('reset_success',           'en', 'Password updated. You can now sign in.'),
  ('reset_err_empty',         'en', 'Please enter and confirm your new password.'),
  ('reset_err_mismatch',      'en', 'Passwords do not match.'),
  ('reset_err_weak',          'en', 'Password must be at least 8 characters with letters and numbers.'),
  ('reset_err_expired',       'en', 'This reset link has expired or has already been used.')

ON CONFLICT (key, language_code) DO NOTHING;
