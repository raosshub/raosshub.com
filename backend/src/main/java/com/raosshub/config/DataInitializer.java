package com.raosshub.config;

import com.raosshub.entity.User;
import com.raosshub.repository.UserRepository;
import com.raosshub.repository.NdaAgreementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Runs on every startup. All inserts use ON CONFLICT DO NOTHING.
 *
 * Multi-language rule:
 *   EN is the ONLY language seeded here — it is the system base language.
 *   Every other language (ZH, FR, DE, AR ...) gets its UI strings via
 *   Kimi translation in Admin Setup → Language & Translation → Set Default.
 *   The t() fallback chain handles missing strings: current → default(EN) → hardcoded param.
 *
 *   ZH rows that already exist in the database from schema.sql are preserved
 *   by ON CONFLICT DO NOTHING — this seed never overwrites anything.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository          userRepository;
    private final NdaAgreementRepository  ndaAgreementRepository;
    private final PasswordEncoder         passwordEncoder;
    private final JdbcTemplate            jdbcTemplate;

    private static final String UPSERT =
        "INSERT INTO ui_messages (key, language_code, value) VALUES (?, ?, ?) " +
        "ON CONFLICT (key, language_code) DO NOTHING";

    @Override
    public void run(String... args) {
        // Schema migration — idempotent, safe to run on every startup
        jdbcTemplate.execute(
            "ALTER TABLE nda_agreements ADD COLUMN IF NOT EXISTS accepted_version VARCHAR(50)"
        );
        ensureAdminUser();
        ensureDefaultUser();
        seedEnUiMessages();
    }

    // ─── Users ────────────────────────────────────────────────────────────────

    private void ensureAdminUser() {
        User admin = userRepository.findByUsername("admin").orElse(null);
        if (admin == null) {
            admin = new User();
            admin.setUsername("admin");
            admin.setEmail("admin@raoss.com");
            admin.setFirstName("System");
            admin.setLastName("Administrator");
            admin.setRole("superadmin");
            admin.setTeams(new String[]{"all"});
            admin.setCanViewActivity(true);
            admin.setIsActive(true);
        }
        admin.setPasswordHash(passwordEncoder.encode("RaossAdmin2024!"));
        userRepository.save(admin);
        log.info("[Init] Admin user ready");
    }

    private void ensureDefaultUser() {
        if (userRepository.findByUsername("rizan").isPresent()) return;
        User u = new User();
        u.setUsername("rizan");
        u.setEmail("rizan@raoss.com");
        u.setFirstName("Rizan");
        u.setLastName("User");
        u.setRole("user");
        u.setTeams(new String[]{"all"});
        u.setCanViewActivity(false);
        u.setIsActive(true);
        u.setPasswordHash(passwordEncoder.encode("RaossUser2024!"));
        userRepository.save(u);
        log.info("[Init] Default user ready");
    }

    // ─── EN UI string seeds ────────────────────────────────────────────────────
    // Only EN is seeded. Every key must have a hardcoded EN fallback in t() calls.
    // Other languages are populated by running Kimi translation in Tab 2.

    private void en(String key, String value) {
        jdbcTemplate.update(UPSERT, key, "en", value);
    }

    private void seedEnUiMessages() {

        // ── Loading / init ────────────────────────────────────────────────────
        en("loading_init",   "Initialising...");
        en("loading_config", "Loading configuration...");
        en("loading_locale", "Loading language files...");
        en("loading_auth",   "Checking credentials...");
        en("loading_done",   "Ready");
        en("loading_app",    "Loading…");

        // ── Login ─────────────────────────────────────────────────────────────
        en("login_title",         "Sign in");
        en("login_subtitle",      "Enter your credentials to continue");
        en("login_label_email",   "Email / Username");
        en("login_label_password","Password");
        en("login_remember",      "Remember me");
        en("login_btn",           "Sign in");
        en("login_forgot",        "Forgot password?");
        en("login_err_empty",     "Please fill in all fields.");
        en("login_err_invalid",   "Invalid credentials. Please try again.");
        en("login_err_network",   "Connection error. Please try again.");

        // ── Nav ───────────────────────────────────────────────────────────────
        en("nav_overview",    "Overview");
        en("nav_settings",    "Settings");
        en("nav_teams_group", "Teams");
        en("nav_admin_setup", "Admin Setup");
        en("nav_activity_log","Activity Log");
        en("nav_hub_assist",  "HUB Assist");

        // ── Topbar ────────────────────────────────────────────────────────────
        en("topbar_hub_label","HUB Dashboard");

        // ── Tools ─────────────────────────────────────────────────────────────
        en("tool_theme_light",  "Light Mode");
        en("tool_theme_dark",   "Dark Mode");
        en("tool_hub_assist",   "HUB Assist");
        en("tool_activity_log", "Activity Log");
        en("tool_sign_out",     "Sign Out");
        en("tool_project_config","Project Config");

        // ── NDA ───────────────────────────────────────────────────────────────
        en("nda_subtitle",  "Confidentiality & Access Terms");
        en("nda_checkbox",  "I have read and agree to the confidentiality agreement.");
        en("nda_btn_agree", "I Agree");
        en("nda_btn_decline","Decline & Exit");

        // ── Notifications ────────────────────────────────────────────────────
        en("notif_title", "Notifications");
        en("notif_clear", "Clear All");
        en("notif_empty", "No notifications");

        // ── Buttons ───────────────────────────────────────────────────────────
        en("btn_save",       "Save");
        en("btn_cancel",     "Cancel");
        en("btn_edit",       "Edit");
        en("btn_delete",     "Delete");
        en("btn_add",        "Add");
        en("btn_show",       "Show");
        en("btn_hide",       "Hide");
        en("btn_confirm",    "Confirm");
        en("btn_remove",     "Remove");
        en("btn_filter",     "Filter");
        en("btn_export_csv", "Export CSV");
        en("btn_prev",       "Previous");
        en("btn_next",       "Next");

        // ── Search ────────────────────────────────────────────────────────────
        en("search_placeholder","Search…");

        // ── Filters (activity log) ────────────────────────────────────────────
        en("filter_all_users",   "All Users");
        en("filter_all_actions", "All Actions");
        en("filter_all_resources","All Resources");
        en("filter_login",       "Login");
        en("filter_logout",      "Logout");
        en("filter_upload",      "Upload");
        en("filter_delete",      "Delete");
        en("filter_update",      "Update");
        en("filter_create",      "Create");
        en("filter_auth",        "Auth");
        en("filter_gallery",     "Gallery");
        en("filter_files",       "Files");
        en("filter_content",     "Content");
        en("filter_config_res",  "Config");

        // ── Audit log ─────────────────────────────────────────────────────────
        en("log_click_filter",  "Click Filter to load logs");
        en("log_loading",       "Loading...");
        en("log_no_records",    "No records found");
        en("log_records_found", "records found");
        en("log_accept_nda",    "Accepted NDA");
        en("col_details",       "Details");
        en("render_error",      "Page render error.");

        // ── Password ──────────────────────────────────────────────────────────
        en("pwd_err_current",  "Please enter your current password");
        en("pwd_err_empty_new","Please enter a new password");
        en("pwd_err_short",    "Password must be at least 8 characters");
        en("pwd_err_letter",   "Password must contain a letter");
        en("pwd_err_number",   "Password must contain a number");
        en("pwd_err_mismatch", "Passwords do not match");
        en("pwd_success",      "Password updated");
        en("pwd_err_incorrect","Current password is incorrect");
        en("pwd_err_failed",   "Password update failed: ");

        // ── Teams ─────────────────────────────────────────────────────────────
        en("team_restore_confirm","Restore team \"{name}\"?");
        en("team_restored",       "Team \"{name}\" restored");
        en("team_remove_confirm", "Remove team \"{name}\"?\n\nTeam data will be archived.");
        en("team_archived",       "Team archived");

        // ── Overview (ov_*) ───────────────────────────────────────────────────
        en("ov_kpi_actions",    "Open Actions");
        en("ov_kpi_milestones", "Milestones");
        en("ov_kpi_teams",      "Teams");
        en("ov_no_milestones",  "No milestones yet.");
        en("ov_no_actions",     "No open actions");
        en("ov_exec_title",     "Executive Summary");
        en("ov_timeline",       "Timeline & Milestones");
        en("ov_responsibility", "Responsibility Matrix");
        en("ov_resp_team",      "Team");
        en("ov_resp_owner",     "Owner / Leader");
        en("ov_resp_scope",     "Main Scope");
        en("ov_3d_viewer",      "3D Product Viewer");
        en("ov_product_image",  "Product Image");
        en("ov_gallery",        "Gallery");
        en("ov_actions",        "Open Actions");
        en("ov_action_priority","Priority");
        en("ov_action_task",    "Task");
        en("ov_action_team",    "Team");
        en("ov_no_content",     "No content yet. Go to Admin Setup → Dashboard Settings to add content.");

        // ── Milestone status (stored EN, displayed via t()) ───────────────────
        en("status_planned",     "Planned");
        en("status_in_progress", "In Progress");
        en("status_completed",   "Completed");
        en("status_delayed",     "Delayed");
        en("status_on_hold",     "On Hold");
        en("milestone_start_date","Start Date");
        en("milestone_end_date",  "End Date");

        // ── Admin Setup page ──────────────────────────────────────────────────
        en("admin_setup_title",        "Admin Setup");
        en("admin_setup_desc",         "Configure your hub. These settings affect how the hub appears to all users.");
        en("admin_access_denied",      "Access Denied");
        en("admin_access_denied_desc", "Only Super Admin users can access the Admin Setup page.");
        en("admin_coming_soon",        "Coming Soon");
        en("admin_unsaved_changes",    "Unsaved changes");
        en("admin_all_saved",          "All saved");
        en("admin_save_changes",       "Save Changes");
        en("admin_saving",             "Saving…");
        en("admin_discard_changes",    "Discard Changes");
        en("admin_reset_to_default",   "Reset to Default");

        // ── Tab labels ────────────────────────────────────────────────────────
        en("tab_identity_label",      "Project Identity & Branding");
        en("tab_identity_desc",       "Name, branding, product visuals, contact, IP notices");
        en("tab_language_label",      "Language & Translation");
        en("tab_language_desc",       "Default language, add languages, AI translation");
        en("tab_dashboard_label",     "Dashboard Settings");
        en("tab_dashboard_desc",      "Executive summary, specs, timeline, responsibility");
        en("tab_users_label",         "Users");
        en("tab_users_desc",          "Add, edit, deactivate users, roles, permissions");
        en("tab_teams_label",         "Teams");
        en("tab_teams_desc",          "Add, edit, reorder teams, assign icons");
        en("tab_notifications_label", "Notification Settings");
        en("tab_notifications_desc",  "Version display, NDA text & enforcement");
        en("tab_integrations_label",  "Integrations");
        en("tab_integrations_desc",   "Kimi API key, email SMTP, Danger Zone");
        en("tab_hubassist_label",     "Hub Assist");
        en("tab_hubassist_desc",      "Kimi behavior, prompt templates, rate limits");
        en("tab_auditlog_label",      "Audit Log");
        en("tab_auditlog_desc",       "View-only activity trail");

        // ── Language & Translation tab (lt_*) ─────────────────────────────────
        en("lt_loading",              "Loading…");
        en("lt_default_lang_section", "Default Language");
        en("lt_default_lang_desc",    "All content is authored in this language. Kimi translates from here to every new language.");
        en("lt_active_languages",     "Active Languages");
        en("lt_add_language",         "Add Language");
        en("lt_set_default",          "Set Default");
        en("lt_set_default_action",   "Set as Default Language");
        en("lt_default_badge",        "Default");
        en("lt_rtl",                  "RTL");
        en("lt_lang_code",            "Language Code");
        en("lt_lang_name_en",         "Language Name (English)");
        en("lt_lang_name_native",     "Native Name");
        en("lt_rtl_direction",        "Right-to-left text direction");
        en("lt_cancel",               "Cancel");
        en("lt_add_btn",              "Add");
        en("lt_ai_translation",       "AI Translation");
        en("lt_translate_to",         "Translate to");
        en("lt_source_label",         "Source");
        en("lt_start",                "Start Translation");
        en("lt_stop",                 "Stop");
        en("lt_translating_status",   "Translating…");
        en("lt_preflight",            "Pre-flight Check");
        en("lt_no_api_key_msg",       "No Kimi API key configured. Go to Admin Setup → Integrations.");
        en("lt_complete",             "Translation complete");
        en("lt_sections_label",       "sections");
        en("lt_ui_strings_label",     "UI Strings");
        en("lt_locale_content_label", "Locale Content");
        en("lt_done",                 "Done");
        en("lt_error",                "Error");
        en("lt_pending",              "Pending");
        en("lt_translating_item",     "Translating");
        en("lt_no_sections",          "No content sections found. Add content in Dashboard Settings first.");
        en("lt_target_lang",          "Target Language");
        en("lt_translation_aborted",  "Translation stopped — Kimi API key not configured.");
        en("lt_lang_deactivated",     "Language deactivated");
        en("lt_lang_activated",       "Language activated");
        en("lt_default_changed",      "Default language updated");
        en("lt_lang_added",           "Language added");
        en("lt_kimi_required_title",  "Kimi API Key Required");
        en("lt_kimi_required_body",   "A Kimi API key is needed to translate UI strings before setting a new default language.");
        en("lt_coverage_title",       "Translation Required Before Setting Default");
        en("lt_coverage_body",        "is missing UI strings. Kimi will translate all missing strings before setting this as the default language.");
        en("lt_translate_and_default","Translate & Set Default");
        en("lt_do_not_close",         "Do not close this window.");
        en("lt_kimi_testing",         "Testing connection…");
        en("lt_kimi_connected",       "Connected");
        en("lt_kimi_failed",          "Connection failed");
        en("lt_test_connection",      "Test Connection");
        en("lt_return_language_tab",  "Return to Language Settings");

        // ── Dashboard Settings tab (dt_*) ─────────────────────────────────────
        en("dt_exec_summary",        "Executive Summary");
        en("dt_section_title_label", "Section Title");
        en("dt_intro_text",          "Intro Text");
        en("dt_specs_badges",        "Specs Badges");
        en("dt_feature_list",        "Feature List");
        en("dt_add_feature",         "Add Feature");
        en("dt_timeline_title",      "Timeline / Milestones");
        en("dt_timeline_hint",       "Each group becomes one kanban column on the Overview. Groups and milestones display in the order set here.");
        en("dt_no_groups",           "No groups yet. Add the first group below.");
        en("dt_group_name_ph",       "Group name  e.g. Q1 2026 or Phase 1");
        en("dt_milestones_count",    "milestones");
        en("dt_milestone_count",     "milestone");
        en("dt_move_group_up",       "Move group up");
        en("dt_move_group_down",     "Move group down");
        en("dt_delete_group",        "Delete group");
        en("dt_no_milestones",       "No milestones yet. Add the first one below.");
        en("dt_milestone_title_ph",  "Milestone title");
        en("dt_date_label_col",      "Date Label");
        en("dt_date_col",            "Date");
        en("dt_status_col",          "Status");
        en("dt_add_milestone",       "Add Milestone");
        en("dt_add_group",           "Add Group");
        en("dt_resp_matrix",         "Responsibility Matrix");
        en("dt_resp_desc",           "Each row maps a team and owner to a scope of work. The same team can appear in multiple rows.");
        en("dt_resp_team_col",       "Team");
        en("dt_resp_owner_col",      "Owner / Leader");
        en("dt_resp_scope_col",      "Main Scope");
        en("dt_no_rows",             "No rows yet.");
        en("dt_add_row",             "Add Row");
        en("dt_no_teams_warn",       "No teams yet — add teams in Admin Setup > Teams.");
        en("dt_no_users_warn",       "No users yet — add users in Admin Setup > Users.");
        en("dt_select_team_ph",      "Select team…");
        en("dt_select_owner_ph",     "Select owner…");
        en("dt_spec_ph",             "e.g. 5.5in TFT — press Enter");
        en("dt_feat_ph",             "Feature description");
        en("dt_intro_ph",            "Brief introduction…");
        en("dt_title_ph",            "e.g. Product Overview");
        en("dt_remove_group_confirm","Remove this group and all its milestones?");
        en("dt_discard_confirm",     "Discard all unsaved changes and reload from database?");
        en("dt_save_success",        "Dashboard settings saved");
        en("dt_save_fail",           "Save failed");

        // ── Integrations tab (int_*) ──────────────────────────────────────────
        en("int_loading",                "Loading…");
        en("int_kimi_title",             "Kimi AI Integration");
        en("int_api_key",                "API Key");
        en("int_api_key_set",            "API key set");
        en("int_api_key_not_set",        "Not configured — enter key to enable AI translation");
        en("int_kimi_desc",              "Get your key at platform.moonshot.cn. Takes effect immediately on save — no backend restart needed.");
        en("int_test_connection",        "Test Connection");
        en("int_testing",                "Testing…");
        en("int_connected",              "Connected");
        en("int_conn_failed",            "Connection failed — check your key");
        en("int_smtp_title",             "Email SMTP");
        en("int_smtp_host",              "Host");
        en("int_smtp_port",              "Port");
        en("int_smtp_username",          "Username");
        en("int_smtp_password",          "Password");
        en("int_smtp_from",              "From Address");
        en("int_smtp_tls",               "TLS / STARTTLS");
        en("int_smtp_tls_enabled",       "(enabled)");
        en("int_smtp_tls_disabled",      "(disabled)");
        en("int_danger_title",           "Danger Zone");
        en("int_reset_data_title",       "Reset Data");
        en("int_reset_data_desc",        "Clears all locale_content — all translated sections across all languages. Keeps users, teams, project config, and language definitions.");
        en("int_reset_confirm_label",    "Type RESET to confirm");
        en("int_reset_btn",              "Reset Data");
        en("int_resetting",              "Resetting…");
        en("int_factory_title",          "Factory Reset");
        en("int_factory_desc",           "Clears everything — locale content, project config, integrations, teams, files, non-superadmin users. Keeps only superadmin accounts. Backend returns to fresh-install state. This CANNOT be undone.");
        en("int_factory_proceed",        "I understand the risk, proceed");
        en("int_factory_confirm_heading","Confirm: This action CANNOT be undone");
        en("int_factory_confirm_desc",   "All team content, files, translations, and configuration will be permanently deleted. All non-superadmin users will be removed. Confirm you have backed up anything you need.");
        en("int_factory_yes",            "Yes, I confirm");
        en("int_factory_cancel",         "Cancel");
        en("int_factory_confirm_label",  "Type FACTORY RESET to confirm");
        en("int_factory_btn",            "Execute Factory Reset");
        en("int_factory_running",        "Running…");
        en("int_save_success",           "Integrations saved");
        en("int_save_fail",              "Save failed");
        en("int_load_fail",              "Failed to load integrations config");
        en("int_reloading",              "Reloading…");

        // ── Language dropdown (Add Language form) ─────────────────────────────
        en("lt_select_language",  "Select a language…");
        en("lt_custom_language",  "Other / Custom (enter manually)");

        // ── NDA modal ─────────────────────────────────────────────────────────
        en("nda_title",       "Non-Disclosure Agreement");
        en("nda_item1_title", "Confidentiality:");
        en("nda_item1_body",  "All project information, including technical specifications, design files, source code, and business strategies, is strictly confidential.");
        en("nda_item2_title", "Non-Disclosure:");
        en("nda_item2_body",  "You agree not to disclose, share, or transmit any project information to third parties without explicit written consent.");
        en("nda_item3_title", "Authorized Use Only:");
        en("nda_item3_body",  "Access is granted for authorized project purposes only. Any unauthorized use or reproduction is strictly prohibited.");
        en("nda_item4_title", "Data Protection:");
        en("nda_item4_body",  "All personal and project data must be handled in accordance with applicable data protection regulations.");
        en("nda_item5_title", "Consequences:");
        en("nda_item5_body",  "Violation of this agreement may result in immediate access revocation and legal action.");

        // ── Tab 7 — Backend status ─────────────────────────────────────────
        en("int_backend_status",   "Backend Status");
        en("int_backend_online",   "Online");
        en("int_backend_offline",  "Offline");
        en("int_backend_checking", "Checking…");
        en("int_backend_refresh",  "Refresh");
        en("int_backend_ms",       "ms");

        // ── Tab 7 — SMTP test ─────────────────────────────────────────────
        en("int_smtp_test_btn",     "Test SMTP");
        en("int_smtp_testing",      "Testing…");
        en("int_smtp_connected",    "SMTP Connected");
        en("int_smtp_failed",       "Connection Failed");
        en("int_smtp_ssl_required", "SSL (required for port 465)");
        en("int_smtp_starttls_note","STARTTLS (recommended)");

        // ── Tab 7 — NDA editor ────────────────────────────────────────────
        en("int_nda_section",       "NDA Agreement");
        en("int_nda_section_desc",  "Appears in the NDA modal after login. Supports Markdown: **bold**, *italic*, # Heading, - Bullet");
        en("int_nda_edit_btn",      "Edit");
        en("int_nda_preview_btn",   "Preview");
        en("int_nda_placeholder",   "# Non-Disclosure Agreement\n\nAll information is strictly confidential.");
        en("int_nda_preview_empty", "Nothing to preview — add content in Edit mode.");
        en("int_nda_bold",   "B");
        en("int_nda_italic", "I");
        en("int_nda_h1",     "H1");
        en("int_nda_h2",     "H2");
        en("int_nda_h3",     "H3");
        en("int_nda_bullet", "•");

        // ── Tab 6 — Notification Settings ─────────────────────────────────
        en("tab6_version_section",       "Version Display");
        en("tab6_version_desc",          "Control whether the project version number is visible to all users.");
        en("tab6_show_version",          "Show version number to users");
        en("tab6_version_shown",         "Version is visible in the interface");
        en("tab6_version_hidden",        "Version is hidden from users");
        en("tab6_nda_section",           "NDA Agreement Text");
        en("tab6_nda_desc",              "This content appears in the NDA modal after every login. Supports Markdown: **bold**, *italic*, # Heading, - Bullet");
        en("tab6_nda_edit_btn",          "Edit");
        en("tab6_nda_preview_btn",       "Preview");
        en("tab6_nda_placeholder",       "# Non-Disclosure Agreement\n\nAll information in this system is strictly confidential.");
        en("tab6_nda_preview_empty",     "Nothing to preview — add content in Edit mode.");
        en("tab6_nda_bold",              "B");
        en("tab6_nda_italic",            "I");
        en("tab6_nda_h1",                "H1");
        en("tab6_nda_h2",                "H2");
        en("tab6_nda_h3",                "H3");
        en("tab6_nda_bullet",            "•");
        en("tab6_enforcement_section",   "NDA Enforcement");
        en("tab6_enforcement_desc",      "Controls when users are required to re-accept the NDA.");
        en("tab6_force_version_label",   "Force re-acceptance when project version changes");
        en("tab6_force_version_hint",    "When ON: users accept once per version. The NDA re-appears when the version in Project Identity is updated. When OFF: users accept at every login session.");
        en("tab6_current_version",       "Current version");
        en("tab6_save_success",          "Notification settings saved");
        en("tab6_save_fail",             "Save failed");


        // ── Tab 1 — Project Identity Tab ──────────────────────────────────────
        en("tab1_loading",               "Loading\u2026");
        en("tab1_page_title",            "Project Identity & Branding");
        en("tab1_page_desc",             "Define your product identity, branding, and legal notices.");
        en("tab1_save_success",          "Configuration saved successfully");
        en("tab1_save_fail",             "Save failed");
        en("tab1_upload_success",        "Uploaded successfully");
        en("tab1_upload_fail",           "Upload failed");
        en("tab1_file_too_large",        "File too large \u2014 max {size} MB");
        en("tab1_reset_confirm",         "Reset all fields to defaults?");
        en("tab1_uploading",             "Uploading\u2026");
        en("tab1_click_upload",          "Click to upload");
        en("tab1_replace",               "Replace");
        en("tab1_remove",                "Remove");
        en("tab1_3d_model_uploaded",     "3D Model Uploaded");
        en("tab1_section_basic",         "Basic Information");
        en("tab1_project_name",          "Project Name");
        en("tab1_product_code",          "Product Code / SKU");
        en("tab1_company_name",          "Company Name");
        en("tab1_status",                "Status");
        en("tab1_status_planning",       "Planning");
        en("tab1_status_development",    "In Development");
        en("tab1_status_prototype",      "Prototype");
        en("tab1_status_production",     "Production");
        en("tab1_status_maintenance",    "Maintenance");
        en("tab1_status_completed",      "Completed");
        en("tab1_site_title",            "Site Name (Browser Tab Title)");
        en("tab1_site_title_hint",       "Sets the browser tab title. If empty, Project Name is used.");
        en("tab1_description",           "Description");
        en("tab1_section_branding",      "Branding");
        en("tab1_logo",                  "Logo");
        en("tab1_logo_hint",             "JPG, PNG, SVG, WebP \u2014 max 10 MB");
        en("tab1_favicon",               "Favicon");
        en("tab1_favicon_hint",          "ICO, PNG, SVG \u2014 max 5 MB");
        en("tab1_primary_color",         "Primary Color");
        en("tab1_section_visuals",       "Product Visuals");
        en("tab1_product_images",        "Product Images");
        en("tab1_product_images_hint",   "JPG, PNG, WebP \u2014 max 10 MB each");
        en("tab1_product_model",         "3D Model (.glb / .gltf)");
        en("tab1_product_model_hint",    "GLB, GLTF \u2014 max 50 MB");
        en("tab1_section_contact",       "Contact & Links");
        en("tab1_contact_email",         "Contact Email");
        en("tab1_website_url",           "Website URL");
        en("tab1_ref_links",             "Reference Links");
        en("tab1_ref_links_hint",        "Admin only \u2014 one URL per line");
        en("tab1_section_icp",           "Intellectual Property & Compliance");
        en("tab1_icp_zh",                "ICP \u2014 Chinese");
        en("tab1_icp_zh_hint",           "Shown when Chinese language is selected");
        en("tab1_icp_en",                "ICP \u2014 English");
        en("tab1_icp_en_hint",           "Shown for all other languages");
        en("tab1_patent",                "Patent Notice");
        en("tab1_trademark",             "Trademark Notice");
        en("tab1_copyright",             "Copyright Notice");


        en("tab6_translate_no_kimi",  "Kimi API key not configured \u2014 NDA saved in EN only");
        en("tab6_translating",        "Translating to {lang}\u2026");
        en("tab6_translate_partial",  "Translation failed for: {langs}");

        log.info("[Init] EN UI message seeds applied");
    }
}
