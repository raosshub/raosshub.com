-- ============================================================
-- v3.7.2 — Kimi/AI → Hub rebrand + ICP ZH placeholder
-- Replaces "Kimi" and "AI Translation" with "Hub" branding
-- in all UI visible to end users.
-- Kimi API key section in Integrations tab is NOT changed.
-- Run via: run-seed.bat → Admin Setup → Language tab → Kimi
-- ============================================================

INSERT INTO ui_messages (key, language_code, value) VALUES
  -- Tab 2 Language & Translation
  ('lt_ai_translation',       'en', 'Hub Translation'),
  ('lt_no_api_key_msg',       'en', 'No Hub AI key configured. Go to Admin Setup → Integrations.'),
  ('lt_translation_aborted',  'en', 'Translation stopped — Hub AI key not configured.'),
  ('lt_kimi_required_title',  'en', 'Hub AI Key Required'),
  ('lt_kimi_required_body',   'en', 'A Hub AI key is needed to translate UI strings before setting a new default language.'),
  ('lt_coverage_body',        'en', 'is missing UI strings. Hub will translate all missing strings before setting this as the default language.'),
  ('lt_source_always_en',     'en', 'Hub always translates from English (EN)'),

  -- Tab descriptions
  ('tab_integrations_desc',   'en', 'Hub AI, email SMTP, Danger Zone'),
  ('tab_hubassist_desc',      'en', 'HUB Assist behavior, prompt templates, rate limits'),
  ('tab_language_desc',       'en', 'Default language, add languages, Hub translation'),

  -- Initial Setup wizard Step 3
  ('setup_s3_title_required', 'en', 'Hub Translation Key (Required)'),
  ('setup_s3_title_optional', 'en', 'Hub Translation Key (Optional)'),
  ('setup_s3_desc_required',  'en', 'A Hub AI key is required to translate the interface to {lang}.'),
  ('setup_s3_desc_optional',  'en', 'Add a Hub AI key now or later in Admin Setup > Integrations.'),

  -- Change Default Language wizard Step 2
  ('change_lang_s2_title',    'en', 'Hub AI Key'),

  -- Tab 6 Notification Settings
  ('tab6_translate_no_kimi',  'en', 'Hub AI key not configured — agreement saved in EN only'),

  -- Tab 1 ICP ZH placeholder (fake number — not a real ICP)
  ('tab1_icp_zh_ph',          'en', '粤ICP备00000000号'),

  -- Missed in first pass
  ('lt_kimi_required_title',  'en', 'Hub AI Key Required'),
  ('change_lang_s2_label',    'en', 'Hub AI Key')

ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

-- lt_nda_label (added for Tab 2 Site Agreement row)
INSERT INTO ui_messages (key, language_code, value) VALUES
  ('lt_nda_label', 'en', 'Site Agreement')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;
