-- RAOSS Hub v3.2.2 — login field changed from username to email
-- Run with run-seed.bat → pick this file

-- Update login label: "Username" → "Email"
INSERT INTO ui_messages (key, language_code, value) VALUES
  ('login_username', 'en', 'Email')
ON CONFLICT (key, language_code) DO NOTHING;

UPDATE ui_messages
SET value = 'Email'
WHERE key = 'login_username' AND language_code = 'en';

-- Update login placeholder
INSERT INTO ui_messages (key, language_code, value) VALUES
  ('login_username_placeholder', 'en', 'Enter your email address')
ON CONFLICT (key, language_code) DO NOTHING;

UPDATE ui_messages
SET value = 'Enter your email address'
WHERE key = 'login_username_placeholder' AND language_code = 'en';
