-- ═══════════════════════════════════════════════════════════════
-- RAOSS Hub v3 — NDA i18n seed (patch v3.1.1)
-- Adds 11 missing EN keys used by NDAModal that were never in
-- ui_messages, so Kimi translation could not pick them up.
--
-- Safe to run multiple times: ON CONFLICT DO NOTHING.
-- Run ONCE against your raosshub database, then restart backend
-- (DataInitializer also picks these up on next startup).
-- ═══════════════════════════════════════════════════════════════

INSERT INTO ui_messages (key, language_code, value) VALUES
  -- Modal title (nda_subtitle, checkbox, buttons were already seeded)
  ('nda_title',      'en', 'Non-Disclosure Agreement'),

  -- Default fallback items — shown when admin has not authored custom NDA
  -- text in Admin Setup → Notifications tab. Kimi translates these alongside
  -- all other UI strings when a new language is added in Admin Setup → Language.
  ('nda_item1_title','en', 'Confidentiality:'),
  ('nda_item1_body', 'en', 'All project information, including technical specifications, design files, source code, and business strategies, is strictly confidential.'),
  ('nda_item2_title','en', 'Non-Disclosure:'),
  ('nda_item2_body', 'en', 'You agree not to disclose, share, or transmit any project information to third parties without explicit written consent.'),
  ('nda_item3_title','en', 'Authorized Use Only:'),
  ('nda_item3_body', 'en', 'Access is granted for authorized project purposes only. Any unauthorized use or reproduction is strictly prohibited.'),
  ('nda_item4_title','en', 'Data Protection:'),
  ('nda_item4_body', 'en', 'All personal and project data must be handled in accordance with applicable data protection regulations.'),
  ('nda_item5_title','en', 'Consequences:'),
  ('nda_item5_body', 'en', 'Violation of this agreement may result in immediate access revocation and legal action.')
ON CONFLICT (key, language_code) DO NOTHING;
