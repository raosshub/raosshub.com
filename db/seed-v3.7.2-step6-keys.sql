-- ============================================================
-- v3.7.2 — Step 6 auto-translation string keys
-- Run via: run-seed.bat → Admin Setup → Language tab → Kimi
-- ============================================================

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s6_phase1',    'en', 'Default language set'),
  ('change_lang_s6_phase2',    'en', 'Translating UI strings'),
  ('change_lang_s6_trans_done','en', 'Translation complete'),
  ('change_lang_s6_trans_warn','en', 'Translation incomplete — {n} strings failed. Re-run from Language & Translation tab.'),
  ('change_lang_s6_trans_fail','en', 'Translation could not start. Go to Language & Translation to translate later.'),
  ('change_lang_s6_trans_skip','en', 'No Kimi key configured — translation skipped. Go to Language & Translation to translate later.')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;
