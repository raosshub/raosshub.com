-- ============================================================
-- v3.7.2 — Tab 1 placeholder string keys
-- Replaces hardcoded English placeholders in ProjectIdentityTab
-- Run via: run-seed.bat → Admin Setup → Language tab → Kimi
-- ============================================================

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('tab1_project_name_ph', 'en', 'e.g. My Product Name'),
  ('tab1_product_code_ph', 'en', 'e.g. PRD-2024-001'),
  ('tab1_company_name_ph', 'en', 'e.g. Your Company Name'),
  ('tab1_site_title_ph',   'en', 'e.g. My Product Name'),
  ('tab1_description_ph',  'en', 'Brief product description...'),
  ('tab1_contact_email_ph','en', 'contact@company.com'),
  ('tab1_website_url_ph',  'en', 'https://www.company.com'),
  ('tab1_ref_links_ph',    'en', 'One URL per line...'),
  ('tab1_icp_en_ph',       'en', 'Guangdong ICP Record No. 2025454823'),
  ('tab1_patent_ph',       'en', 'e.g. Protected by patents: US10,123,456 B2'),
  ('tab1_trademark_ph',    'en', 'e.g. Company Name™ is a trademark of...'),
  ('tab1_copyright_ph',    'en', 'e.g. © 2024 Company Name. All rights reserved.')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;
