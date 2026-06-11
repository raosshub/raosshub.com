-- ============================================================
-- RAOSS Hub v3.7 — Language Setup string keys
--
-- Adds all EN UI strings for:
--   Flow 1 — Initial Setup wizard     (setup_*)
--   Flow 2 — Change Default Language  (change_lang_*)
--
-- Uses ON CONFLICT DO UPDATE so existing installs get the
-- correct new values for any keys that changed.
--
-- Safe to run multiple times.
-- Run via: run-seed.bat -> pick this file
-- ============================================================

INSERT INTO ui_messages (key, language_code, value) VALUES

-- ── Initial Setup wizard (Flow 1) ────────────────────────────────────────
('setup_welcome_title',     'en', 'Welcome to the HUB'),
('setup_welcome_subtitle',  'en', 'Your product development portal'),
('setup_s1_label',          'en', 'Admin Account'),
('setup_s1_title',          'en', 'Set Admin Credentials'),
('setup_s1_desc',           'en', 'Replace the default admin credentials with your own.'),
('setup_s1_email',          'en', 'Admin Email'),
('setup_s1_email_ph',       'en', 'admin@yourcompany.com'),
('setup_s1_password',       'en', 'Password'),
('setup_s1_password_ph',    'en', 'Min. 8 characters with letters and numbers'),
('setup_s1_confirm',        'en', 'Confirm Password'),
('setup_s1_confirm_ph',     'en', 'Repeat password'),
('setup_s1_warning',        'en', 'Store your password safely — it cannot be recovered without database access.'),
('setup_s1_err_email',      'en', 'Please enter a valid email address.'),
('setup_s1_err_password',   'en', 'Password must be at least 8 characters with letters and numbers.'),
('setup_s1_err_mismatch',   'en', 'Passwords do not match.'),
('setup_s2_label',          'en', 'Default Language'),
('setup_s2_title',          'en', 'Choose Default Language'),
('setup_s2_desc',           'en', 'The primary language for this deployment.'),
('setup_s2_no_langs',       'en', 'No additional languages have been added yet. You can add languages in Admin Setup after completing this setup.'),
('setup_s2_keep_en',        'en', 'Keep English as default'),
('setup_s2_hint',           'en', 'After setup completes, go to Admin Setup > Language & Translation to translate UI strings.'),
('setup_s3_label',          'en', 'AI Translation'),
('setup_s3_title_required', 'en', 'AI Translation Key (Required)'),
('setup_s3_title_optional', 'en', 'AI Translation Key (Optional)'),
('setup_s3_desc_required',  'en', 'A Kimi API key is required to translate the interface to {lang}.'),
('setup_s3_desc_optional',  'en', 'Add a Kimi API key now or later in Admin Setup > Integrations.'),
('setup_s3_key_label',      'en', 'Kimi API Key'),
('setup_s3_key_ph',         'en', 'sk-...'),
('setup_s3_test_btn',       'en', 'Test Connection'),
('setup_s3_testing',        'en', 'Testing…'),
('setup_s3_verified',       'en', 'Connection verified'),
('setup_s3_failed',         'en', 'Connection failed'),
('setup_s3_skip',           'en', 'Skip for now'),
('setup_s3_warn_untested',  'en', 'Key not verified. Continue anyway?'),
('setup_s4_label',          'en', 'Ready'),
('setup_s4_title',          'en', 'Applying Setup'),
('setup_s4_credentials',    'en', 'Saving admin credentials…'),
('setup_s4_kimi',           'en', 'Saving Kimi API key…'),
('setup_s4_language',       'en', 'Setting default language…'),
('setup_s4_strings',        'en', 'Seeding UI strings…'),
('setup_s4_done_title',     'en', 'Setup complete. RAOSS Hub is ready.'),
('setup_s4_go',             'en', 'Go to Dashboard'),
('setup_s4_retry',          'en', 'Retry'),
('setup_s4_start_over',     'en', 'Start Over'),

-- ── Change Default Language wizard (Flow 2) ───────────────────────────────
('change_lang_warning_title',    'en', 'This will delete all data'),
('change_lang_warning_desc',     'en', 'Changing the default language on a live system requires a factory reset. ALL team content, files, locale content, and configuration will be permanently deleted. Only superadmin users are preserved.'),
('change_lang_warning_proceed',  'en', 'I understand — proceed'),
('change_lang_s1_label',         'en', 'Admin Account'),
('change_lang_s1_title',         'en', 'Admin Credentials'),
('change_lang_s1_keep',          'en', 'Keep current credentials'),
('change_lang_s1_desc',          'en', 'Optionally update the admin credentials for this deployment.'),
('change_lang_s2_label',         'en', 'Kimi Key'),
('change_lang_s2_title',         'en', 'Kimi API Key'),
('change_lang_s2_desc',          'en', 'Required to translate UI strings to the new default language.'),
('change_lang_s3_label',         'en', 'Factory Reset'),
('change_lang_s3_title',         'en', 'Factory Reset'),
('change_lang_s3_desc',          'en', 'Permanently deletes all team content, files, locale content, and configuration. Superadmin users are preserved.'),
('change_lang_s3_data_teams',    'en', 'Teams'),
('change_lang_s3_data_sections', 'en', 'Locale sections'),
('change_lang_s3_confirm_label', 'en', 'Type FACTORY RESET to confirm'),
('change_lang_s3_btn',           'en', 'Execute Factory Reset'),
('change_lang_s3_running',       'en', 'Resetting…'),
('change_lang_s4_label',         'en', 'Reseed Strings'),
('change_lang_s4_title',         'en', 'Reseed EN Strings'),
('change_lang_s4_desc',          'en', 'Re-seeds all English UI strings. No backend restart required.'),
('change_lang_s4_btn',           'en', 'Reseed EN Strings'),
('change_lang_s4_running',       'en', 'Reseeding…'),
('change_lang_s4_done',          'en', 'EN strings reseeded successfully'),
('change_lang_s4_next',          'en', 'Continue'),
('change_lang_s4_back_warn',     'en', 'Factory reset has already run. Going back will not undo it.'),
('change_lang_s5_label',         'en', 'Verify'),
('change_lang_s5_title',         'en', 'Verify Clean State'),
('change_lang_s5_desc',          'en', 'Confirming the system is clean before setting the new default language.'),
('change_lang_s5_checking',      'en', 'Checking system state…'),
('change_lang_s5_teams_ok',      'en', 'Teams'),
('change_lang_s5_config_ok',     'en', 'Configuration'),
('change_lang_s5_not_clean',     'en', 'System is not fully clean. Factory reset may not have completed.'),
('change_lang_s5_next',          'en', 'Continue'),
('change_lang_s5_retry',         'en', 'Retry Verification'),
('change_lang_s6_label',         'en', 'Set Default'),
('change_lang_s6_title',         'en', 'Set New Default Language'),
('change_lang_s6_from',          'en', 'Current default'),
('change_lang_s6_to',            'en', 'New default'),
('change_lang_s6_btn',           'en', 'Confirm — Set as Default'),
('change_lang_s6_done',          'en', 'Default language updated'),
('change_lang_s6_next_steps',    'en', 'Next steps: go to Admin Setup > Language & Translation and click Translate All.'),
('change_lang_s6_return',        'en', 'Return to Language Settings'),
('change_lang_cancel',           'en', 'Back to Language Settings'),
('change_lang_page_title',       'en', 'Change Default Language'),
('change_lang_page_subtitle',    'en', 'Follow each step carefully. This process cannot be interrupted once started.'),
('change_lang_resume_banner',    'en', 'A previous language setup was interrupted. Resume from Step {n}?'),
('change_lang_resume_btn',       'en', 'Resume'),
('change_lang_resume_discard',   'en', 'Start over')

ON CONFLICT (key, language_code) DO UPDATE SET value = EXCLUDED.value;
