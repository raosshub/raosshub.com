-- ============================================================
-- v3.7.2 — OverviewPage new string keys
-- Run via: run-seed.bat → Admin Setup → Language tab → Kimi
-- ============================================================

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('ov_drag_rotate',     'en', 'Drag to rotate'),
  ('ov_untitled',        'en', 'Untitled'),
  ('ov_priority_medium', 'en', 'Medium'),
  ('ov_photo',           'en', 'photo'),
  ('ov_photos',          'en', 'photos')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;
