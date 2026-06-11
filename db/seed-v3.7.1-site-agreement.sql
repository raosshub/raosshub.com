-- ============================================================
-- The HUB v3.7.1 — Site Agreement seed
--
-- 1. Updates existing string keys (DO UPDATE)
-- 2. Adds new string keys for Tab 6 title + show mode toggle
-- 3. Seeds default Site Agreement content into project_config
--    for existing installs (fresh installs get it from schema.sql)
--
-- Safe to run multiple times.
-- Run via: run-seed.bat → pick this file
-- ============================================================

-- ── String key updates (DO UPDATE to overwrite old values) ────────────────────
INSERT INTO ui_messages (key, language_code, value) VALUES

-- Updated existing keys
('nda_title',                  'en', 'Site Agreement'),
('nda_subtitle',               'en', 'Access Terms & Conditions'),
('nda_checkbox',               'en', 'I have read and agree to the terms above.'),
('setup_s4_done_title',        'en', 'Setup complete. The HUB is ready.'),
('tab6_nda_section',           'en', 'Site Agreement'),
('tab6_nda_desc',              'en', 'Shown to users before accessing the portal. Supports Markdown: **bold**, *italic*, # Heading, - Bullet'),

-- New keys for title field
('tab6_nda_title_label',       'en', 'Agreement Title'),
('tab6_nda_title_ph',          'en', 'e.g. Site Agreement, Non-Disclosure Agreement'),
('tab6_nda_title_hint',        'en', 'Displayed as the modal heading. Leave blank to use the default title.'),

-- New keys for show mode toggle
('tab6_show_mode_label',       'en', 'Show Agreement'),
('tab6_show_every_login',      'en', 'Every login'),
('tab6_show_once',             'en', 'Once per account'),
('tab6_show_every_login_hint', 'en', 'User must accept on every login. Recommended for NDA mode.'),
('tab6_show_once_hint',        'en', 'User accepts once and is never prompted again.')

ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;


-- ── Seed default Site Agreement content into existing project_config ──────────
-- Only updates configs that have no nda.text_en set yet.
-- Uses jsonb_set to merge — does not overwrite any other config fields.
UPDATE project_config
SET config = jsonb_set(
    jsonb_set(
        jsonb_set(
            config,
            '{nda,title}',
            '"Site Agreement"'::jsonb
        ),
        '{nda,showMode}',
        '"every_login"'::jsonb
    ),
    '{nda,text_en}',
    $nda$"# Site Agreement\n\n## Confidential Access\nThis is a private product development portal. Access is restricted to authorised users only.\n\n## Authorised Use\nYou agree to use this portal only for its intended purpose. Sharing credentials or content with unauthorised parties is prohibited.\n\n## Data Protection\nYour personal data is handled in accordance with applicable data protection regulations. We do not share your data with third parties.\n\n## Intellectual Property\nAll content and materials on this portal are the intellectual property of the owning organisation. All rights reserved."$nda$::jsonb
)
WHERE config -> 'nda' ->> 'text_en' IS NULL
   OR config -> 'nda' ->> 'text_en' = '';
