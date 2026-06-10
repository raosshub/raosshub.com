-- RAOSS Hub v3.2.1 — forgot password email label
-- Run with run-seed.bat → pick this file

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('forgot_label_email', 'en', 'Email')
ON CONFLICT (key, language_code) DO NOTHING;

-- Update placeholder to email-specific text
UPDATE ui_messages
SET value = 'Enter your email address'
WHERE key = 'forgot_placeholder' AND language_code = 'en';

-- Update subtitle and empty-error to say email instead of username
UPDATE ui_messages
SET value = 'Enter your email address to receive a reset link.'
WHERE key = 'forgot_subtitle' AND language_code = 'en';

UPDATE ui_messages
SET value = 'Please enter your email address.'
WHERE key = 'forgot_err_empty' AND language_code = 'en';
