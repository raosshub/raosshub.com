-- ============================================================
-- The HUB v3.7.1 — Branding cleanup seed
--
-- Updates string values changed in v3.7.1:
--   - setup_s4_done_title: "RAOSS Hub" → "The HUB"
--
-- Safe to run multiple times (ON CONFLICT DO UPDATE).
-- Run via: run-seed.bat → pick this file
-- ============================================================

INSERT INTO ui_messages (key, language_code, value) VALUES
    ('setup_s4_done_title', 'en', 'Setup complete. The HUB is ready.')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;
