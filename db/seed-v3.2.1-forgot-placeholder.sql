-- RAOSS Hub v3.2.1 — update forgot_placeholder text
-- Run with run-seed.bat → pick this file

UPDATE ui_messages
SET value = 'Enter your email or username'
WHERE key = 'forgot_placeholder' AND language_code = 'en';
