\encoding UTF8
-- RAOSS Hub v3 -- EN keys for Change Default Language wizard (v3.7.0)
-- Run via run-seed.bat after applying this patch.

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_page_title',    'en', 'Change Default Language')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_page_subtitle', 'en', 'Follow each step carefully. This process cannot be interrupted once started.')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_cancel', 'en', 'Back to Language Settings')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s1_label', 'en', 'Factory Reset')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s2_label', 'en', 'Restart Backend')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s3_label', 'en', 'Verify Clean')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s4_label', 'en', 'Set Default')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s1_title', 'en', 'Execute Factory Reset')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s1_desc', 'en', 'All content, teams, files, and configuration will be permanently deleted. Superadmin accounts are kept. This cannot be undone.')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s1_data_title', 'en', 'Will be deleted:')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s1_teams', 'en', 'team(s)')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s1_sections', 'en', 'locale section(s)')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s1_type_label', 'en', 'Type FACTORY RESET to confirm:')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s1_btn', 'en', 'Execute Factory Reset')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s1_running', 'en', 'Running...')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s2_title', 'en', 'Restart Backend')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s2_desc', 'en', 'The backend must restart so DataInitializer re-seeds the base language strings.')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s2_instruction', 'en', 'In your terminal: stop the backend (Ctrl+C) then restart it (mvn spring-boot:run)')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s2_offline_wait', 'en', 'Waiting for backend to go offline...')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s2_online_wait', 'en', 'Backend is offline -- start it now')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s2_online_done', 'en', 'Backend is back online')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s2_next', 'en', 'Continue')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s3_title', 'en', 'Verify Clean State')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s3_checking', 'en', 'Checking system state...')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s3_teams_ok', 'en', 'Teams')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s3_config_ok', 'en', 'Configuration')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s3_not_clean', 'en', 'System is not fully clean. Ensure factory reset completed and backend restarted.')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s3_next', 'en', 'Continue')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s4_title', 'en', 'Set New Default Language')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s4_desc', 'en', 'Confirm the change. After this, author all content in the new default language and use AI Translation to translate to other languages.')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s4_from', 'en', 'Current default')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s4_to', 'en', 'New default')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s4_btn', 'en', 'Confirm -- Set as Default')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s4_done', 'en', 'Default language updated')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO ui_messages (key, language_code, value) VALUES
  ('change_lang_s4_return', 'en', 'Return to Language Settings')
ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;
