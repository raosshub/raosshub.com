-- ═══════════════════════════════════════════════════════════════
-- RAOSS Hub v3 — PostgreSQL 15+ Schema
-- Tables: languages, ui_messages, locale_content, users, teams,
--   project_config, audit_log, chat_summaries, pdf_documents,
--   pdf_versions, gallery_images, team_files, nda_agreements,
--   password_reset_tokens, translation_jobs
-- Seeded: EN + ZH languages, UI strings, default admin, teams, config
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. LANGUAGES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS languages (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(5) UNIQUE NOT NULL,    -- 'en', 'zh', 'ar', 'ur'
    name        VARCHAR(50) NOT NULL,           -- 'English'
    name_native VARCHAR(50) NOT NULL,           -- 'English', '中文'
    is_rtl      BOOLEAN DEFAULT FALSE,          -- TRUE for ar, ur, he
    is_active   BOOLEAN DEFAULT TRUE,
    is_default  BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO languages (code, name, name_native, is_rtl, is_active, is_default) VALUES
    ('en', 'English', 'English', false, true, true),
    ('zh', 'Chinese', '中文', false, true, false)
ON CONFLICT (code) DO NOTHING;

-- ─── 2. UI MESSAGES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ui_messages (
    id           BIGSERIAL PRIMARY KEY,
    key          VARCHAR(200) NOT NULL,
    language_code VARCHAR(5) NOT NULL REFERENCES languages(code) ON DELETE CASCADE,
    value        TEXT NOT NULL,
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(key, language_code)
);
CREATE INDEX IF NOT EXISTS idx_ui_msgs_lang ON ui_messages(language_code);
CREATE INDEX IF NOT EXISTS idx_ui_msgs_key  ON ui_messages(key);

-- ─── Seed EN UI strings ─────────────────────────────────────────
INSERT INTO ui_messages (key, language_code, value) VALUES
    ('loading_init', 'en', 'Initialising...'),
    ('loading_config', 'en', 'Loading configuration...'),
    ('loading_locale', 'en', 'Loading language files...'),
    ('loading_auth', 'en', 'Checking credentials...'),
    ('loading_done', 'en', 'Ready'),
    ('login_title', 'en', 'Sign in'),
    ('login_subtitle', 'en', 'Enter your credentials to continue'),
    ('login_label_email', 'en', 'Email / Username'),
    ('login_label_password', 'en', 'Password'),
    ('login_remember', 'en', 'Remember me'),
    ('login_btn', 'en', 'Sign in'),
    ('login_forgot', 'en', 'Forgot password?'),
    ('login_err_empty', 'en', 'Please fill in all fields.'),
    ('login_err_invalid', 'en', 'Invalid credentials. Please try again.'),
    ('login_err_network', 'en', 'Connection error. Please try again.'),
    ('nav_overview', 'en', 'Overview'),
    ('nav_settings', 'en', 'Settings'),
    ('nav_teams_group', 'en', 'Teams'),
    ('tool_theme_light', 'en', 'Light Mode'),
    ('tool_theme_dark', 'en', 'Dark Mode'),
    ('tool_hub_assist', 'en', 'HUB Assist'),
    ('tool_activity_log', 'en', 'Activity Log'),
    ('tool_sign_out', 'en', 'Sign Out'),
    ('tool_project_config', 'en', 'Project Config'),
    ('topbar_hub_label', 'en', 'HUB Dashboard'),
    ('nda_subtitle', 'en', 'Confidentiality & Access Terms'),
    ('nda_checkbox', 'en', 'I have read and agree to the Non-Disclosure Agreement.'),
    ('nda_btn_agree', 'en', 'I Agree'),
    ('nda_btn_decline', 'en', 'Decline & Exit'),
    ('notif_title', 'en', 'Notifications'),
    ('notif_clear', 'en', 'Clear all'),
    ('notif_empty', 'en', 'No notifications'),
    ('btn_save', 'en', 'Save'),
    ('btn_cancel', 'en', 'Cancel'),
    ('btn_edit', 'en', 'Edit'),
    ('btn_delete', 'en', 'Delete'),
    ('btn_add', 'en', 'Add'),
    ('btn_remove', 'en', 'Remove'),
    ('btn_close', 'en', 'Close'),
    ('btn_confirm', 'en', 'Confirm'),
    ('btn_back', 'en', 'Back'),
    ('btn_download', 'en', 'Download'),
    ('btn_upload', 'en', 'Upload'),
    ('btn_retry', 'en', 'Retry'),
    ('btn_search', 'en', 'Search'),
    ('cfg_tab_identity', 'en', 'Project Identity'),
    ('cfg_tab_overview', 'en', 'Overview Content'),
    ('cfg_tab_teams', 'en', 'Teams'),
    ('cfg_tab_users', 'en', 'Users'),
    ('cfg_tab_documents', 'en', 'Documents & Translation'),
    ('cfg_tab_system', 'en', 'API & System'),
    ('cfg_tab_auditlog', 'en', 'Audit Log'),
    ('cfg_page_title', 'en', 'Project Configuration'),
    ('cfg_page_subtitle', 'en', 'Super Admin - Hub settings & project management'),
    ('settings_title', 'en', 'Settings'),
    ('settings_profile', 'en', 'Your Profile'),
    ('settings_appearance', 'en', 'Appearance'),
    ('settings_language', 'en', 'Language'),
    ('settings_theme', 'en', 'Theme'),
    ('settings_nda', 'en', 'NDA'),
    ('settings_nda_view', 'en', 'View NDA'),
    ('settings_nda_status', 'en', 'Status'),
    ('settings_nda_accepted', 'en', 'Accepted'),
    ('settings_lang_en', 'en', 'English'),
    ('settings_lang_zh', 'en', 'Chinese'),
    ('settings_theme_dark', 'en', 'Dark'),
    ('settings_theme_light', 'en', 'Light'),
    ('settings_switch_light', 'en', 'Switch to Light'),
    ('settings_switch_dark', 'en', 'Switch to Dark'),
    ('ov_kpi_actions', 'en', 'Open Actions'),
    ('ov_kpi_milestones', 'en', 'Milestones'),
    ('ov_kpi_teams', 'en', 'Teams'),
    ('ov_no_milestones', 'en', 'No milestones configured'),
    ('ov_no_actions', 'en', 'No open actions'),
    ('tab_scope', 'en', 'Scope'),
    ('tab_deliverables', 'en', 'Deliverables'),
    ('tab_collaboration', 'en', 'HUB Chat'),
    ('tab_files', 'en', 'Files'),
    ('tab_pdf', 'en', 'PDF Review'),
    ('tab_gallery', 'en', 'Gallery'),
    ('audit_title', 'en', 'Audit Log'),
    ('audit_empty', 'en', 'No audit log entries found.'),
    ('audit_loading', 'en', 'Loading audit log...'),
    ('audit_col_time', 'en', 'Time'),
    ('audit_col_user', 'en', 'User'),
    ('audit_col_action', 'en', 'Action'),
    ('audit_col_resource', 'en', 'Resource'),
    ('audit_col_detail', 'en', 'Detail'),
    ('audit_col_ip', 'en', 'IP'),
    ('actlog_title', 'en', 'Activity Log'),
    ('actlog_empty', 'en', 'No activity recorded yet.'),
    ('priority_high', 'en', 'High'),
    ('priority_medium', 'en', 'Medium'),
    ('priority_low', 'en', 'Low'),
    ('status_planned', 'en', 'Planned'),
    ('status_current', 'en', 'Current'),
    ('status_done', 'en', 'Done'),
    ('status_delayed', 'en', 'Delayed'),
    ('status_on_hold', 'en', 'On Hold'),
    ('status_in_dev', 'en', 'In Development'),
    ('status_approved', 'en', 'Approved'),
    ('status_rejected', 'en', 'Rejected'),
    ('status_pending', 'en', 'Pending'),
    ('search_placeholder', 'en', 'Search...'),
    ('version_prefix', 'en', 'Document Version'),
    ('toast_config', 'en', 'Config'),
    ('toast_settings', 'en', 'Settings'),
    ('toast_system', 'en', 'System'),
    ('reset_pwd_title', 'en', 'Set New Password'),
    ('reset_pwd_subtitle', 'en', 'Enter your new password below.'),
    ('reset_pwd_btn', 'en', 'Set New Password'),
    ('reset_pwd_err_empty', 'en', 'Please fill in all fields.'),
    ('reset_pwd_err_mismatch', 'en', 'Passwords do not match.'),
    ('reset_pwd_err_weak', 'en', 'Password must be 8+ chars with letters and numbers.'),
    ('reset_pwd_success', 'en', 'Password reset! Please sign in.'),
    ('reset_pwd_expired', 'en', 'Link expired. Please request a new one.'),
    ('quarter_remove_confirm', 'en', 'Remove this quarter and all its milestones?'),
    ('team_restore_confirm', 'en', 'Restore team "{name}"?'),
    ('team_restored', 'en', 'Team "{name}" restored'),
    ('team_remove_confirm', 'en', 'Remove team "{name}"?\n\nTeam data will be archived.'),
    ('team_archived', 'en', 'Team "{name}" removed and archived'),
    ('pwd_err_current', 'en', 'Please enter your current password'),
    ('pwd_err_empty_new', 'en', 'New password cannot be empty'),
    ('pwd_err_short', 'en', 'Password must be at least 8 characters'),
    ('pwd_err_letter', 'en', 'Password must contain at least one letter'),
    ('pwd_err_number', 'en', 'Password must contain at least one number'),
    ('pwd_err_mismatch', 'en', 'Passwords do not match'),
    ('pwd_success', 'en', 'Password updated successfully'),
    ('pwd_err_incorrect', 'en', 'Current password is incorrect'),
    ('pwd_err_failed', 'en', 'Failed to update password: '),
    ('filter_all_users', 'en', 'All Users'),
    ('filter_all_actions', 'en', 'All Actions'),
    ('filter_all_resources', 'en', 'All Resources'),
    ('filter_login', 'en', 'Login'),
    ('filter_logout', 'en', 'Logout'),
    ('filter_upload', 'en', 'Upload'),
    ('filter_delete', 'en', 'Delete'),
    ('filter_update', 'en', 'Update'),
    ('filter_create', 'en', 'Create'),
    ('filter_auth', 'en', 'Auth'),
    ('filter_gallery', 'en', 'Gallery'),
    ('filter_files', 'en', 'Files'),
    ('filter_content', 'en', 'Content'),
    ('filter_config_res', 'en', 'Config'),
    ('btn_filter', 'en', 'Filter'),
    ('btn_export_csv', 'en', 'Export CSV'),
    ('btn_prev', 'en', 'Prev'),
    ('btn_next', 'en', 'Next'),
    ('log_click_filter', 'en', 'Click Filter to load logs'),
    ('log_loading', 'en', 'Loading...'),
    ('log_no_records', 'en', 'No records'),
    ('log_records_found', 'en', 'records found'),
    ('log_accept_nda', 'en', 'Accept NDA'),
    ('col_details', 'en', 'Details'),
    ('render_error', 'en', 'Render error occurred.')
ON CONFLICT (key, language_code) DO NOTHING;

-- ─── Seed ZH UI strings ─────────────────────────────────────────
INSERT INTO ui_messages (key, language_code, value) VALUES
    ('loading_init', 'zh', '初始化中...'),
    ('loading_config', 'zh', '加载配置...'),
    ('loading_locale', 'zh', '加载语言文件...'),
    ('loading_auth', 'zh', '验证凭据...'),
    ('loading_done', 'zh', '就绪'),
    ('login_title', 'zh', '登录'),
    ('login_subtitle', 'zh', '请输入您的凭据继续'),
    ('login_label_email', 'zh', '邮箱 / 用户名'),
    ('login_label_password', 'zh', '密码'),
    ('login_remember', 'zh', '记住我'),
    ('login_btn', 'zh', '登录'),
    ('login_forgot', 'zh', '忘记密码？'),
    ('login_err_empty', 'zh', '请填写所有字段。'),
    ('login_err_invalid', 'zh', '凭据无效，请重试。'),
    ('login_err_network', 'zh', '连接错误，请重试。'),
    ('nav_overview', 'zh', '概览'),
    ('nav_settings', 'zh', '设置'),
    ('nav_teams_group', 'zh', '团队'),
    ('tool_theme_light', 'zh', '浅色模式'),
    ('tool_theme_dark', 'zh', '深色模式'),
    ('tool_hub_assist', 'zh', 'HUB 助手'),
    ('tool_activity_log', 'zh', '活动日志'),
    ('tool_sign_out', 'zh', '退出登录'),
    ('tool_project_config', 'zh', '项目配置'),
    ('topbar_hub_label', 'zh', 'HUB 仪表盘'),
    ('nda_subtitle', 'zh', '保密与访问条款'),
    ('nda_checkbox', 'zh', '我已阅读并同意保密协议。'),
    ('nda_btn_agree', 'zh', '我同意'),
    ('nda_btn_decline', 'zh', '拒绝并退出'),
    ('notif_title', 'zh', '通知'),
    ('notif_clear', 'zh', '全部清除'),
    ('notif_empty', 'zh', '暂无通知'),
    ('btn_save', 'zh', '保存'),
    ('btn_cancel', 'zh', '取消'),
    ('btn_edit', 'zh', '编辑'),
    ('btn_delete', 'zh', '删除'),
    ('btn_add', 'zh', '添加'),
    ('btn_remove', 'zh', '移除'),
    ('btn_close', 'zh', '关闭'),
    ('btn_confirm', 'zh', '确认'),
    ('btn_back', 'zh', '返回'),
    ('btn_download', 'zh', '下载'),
    ('btn_upload', 'zh', '上传'),
    ('btn_retry', 'zh', '重试'),
    ('btn_search', 'zh', '搜索'),
    ('cfg_tab_identity', 'zh', '项目标识'),
    ('cfg_tab_overview', 'zh', '概览内容'),
    ('cfg_tab_teams', 'zh', '团队'),
    ('cfg_tab_users', 'zh', '用户'),
    ('cfg_tab_documents', 'zh', '文档与翻译'),
    ('cfg_tab_system', 'zh', 'API 与系统'),
    ('cfg_tab_auditlog', 'zh', '审计日志'),
    ('cfg_page_title', 'zh', '项目配置'),
    ('cfg_page_subtitle', 'zh', '超级管理员 - Hub 设置与项目管理'),
    ('settings_title', 'zh', '设置'),
    ('settings_profile', 'zh', '个人资料'),
    ('settings_appearance', 'zh', '外观'),
    ('settings_language', 'zh', '语言'),
    ('settings_theme', 'zh', '主题'),
    ('settings_nda', 'zh', '保密协议'),
    ('settings_nda_view', 'zh', '查看协议'),
    ('settings_nda_status', 'zh', '状态'),
    ('settings_nda_accepted', 'zh', '已接受'),
    ('settings_lang_en', 'zh', 'English'),
    ('settings_lang_zh', 'zh', '中文'),
    ('settings_theme_dark', 'zh', '深色'),
    ('settings_theme_light', 'zh', '浅色'),
    ('settings_switch_light', 'zh', '切换到浅色'),
    ('settings_switch_dark', 'zh', '切换到深色'),
    ('ov_kpi_actions', 'zh', '待办事项'),
    ('ov_kpi_milestones', 'zh', '里程碑'),
    ('ov_kpi_teams', 'zh', '团队'),
    ('ov_no_milestones', 'zh', '暂无里程碑'),
    ('ov_no_actions', 'zh', '暂无待办事项'),
    ('tab_scope', 'zh', '范围'),
    ('tab_deliverables', 'zh', '交付物'),
    ('tab_collaboration', 'zh', 'HUB 聊天'),
    ('tab_files', 'zh', '文件'),
    ('tab_pdf', 'zh', 'PDF 审阅'),
    ('tab_gallery', 'zh', '图库'),
    ('audit_title', 'zh', '审计日志'),
    ('audit_empty', 'zh', '暂无审计日志记录。'),
    ('audit_loading', 'zh', '加载审计日志...'),
    ('audit_col_time', 'zh', '时间'),
    ('audit_col_user', 'zh', '用户'),
    ('audit_col_action', 'zh', '操作'),
    ('audit_col_resource', 'zh', '资源'),
    ('audit_col_detail', 'zh', '详情'),
    ('audit_col_ip', 'zh', 'IP'),
    ('actlog_title', 'zh', '活动日志'),
    ('actlog_empty', 'zh', '暂无活动记录。'),
    ('priority_high', 'zh', '高'),
    ('priority_medium', 'zh', '中'),
    ('priority_low', 'zh', '低'),
    ('status_planned', 'zh', '计划中'),
    ('status_current', 'zh', '进行中'),
    ('status_done', 'zh', '已完成'),
    ('status_delayed', 'zh', '延迟'),
    ('status_on_hold', 'zh', '暂停'),
    ('status_in_dev', 'zh', '开发中'),
    ('status_approved', 'zh', '已批准'),
    ('status_rejected', 'zh', '已拒绝'),
    ('status_pending', 'zh', '待审批'),
    ('search_placeholder', 'zh', '搜索...'),
    ('version_prefix', 'zh', '文档版本'),
    ('toast_config', 'zh', '配置'),
    ('toast_settings', 'zh', '设置'),
    ('toast_system', 'zh', '系统'),
    ('reset_pwd_title', 'zh', '设置新密码'),
    ('reset_pwd_subtitle', 'zh', '请在下方输入您的新密码。'),
    ('reset_pwd_btn', 'zh', '确认设置'),
    ('reset_pwd_err_empty', 'zh', '请填写所有字段。'),
    ('reset_pwd_err_mismatch', 'zh', '两次密码不一致。'),
    ('reset_pwd_err_weak', 'zh', '密码须包含字母和数字，至少8位。'),
    ('reset_pwd_success', 'zh', '密码已重置！请重新登录。'),
    ('reset_pwd_expired', 'zh', '链接已失效，请重新申请。'),
    ('quarter_remove_confirm', 'zh', '删除此季度及所有里程碑？'),
    ('team_restore_confirm', 'zh', '恢复团队 "{name}"？'),
    ('team_restored', 'zh', '团队 "{name}" 已恢复'),
    ('team_remove_confirm', 'zh', '删除团队 "{name}"？\n\n团队数据将被归档。'),
    ('team_archived', 'zh', '团队已归档'),
    ('pwd_err_current', 'zh', '请输入当前密码'),
    ('pwd_err_empty_new', 'zh', '请输入新密码'),
    ('pwd_err_short', 'zh', '密码至少8位'),
    ('pwd_err_letter', 'zh', '密码须包含字母'),
    ('pwd_err_number', 'zh', '密码须包含数字'),
    ('pwd_err_mismatch', 'zh', '两次密码不一致'),
    ('pwd_success', 'zh', '密码已更新'),
    ('pwd_err_incorrect', 'zh', '当前密码不正确'),
    ('pwd_err_failed', 'zh', '密码更新失败: '),
    ('filter_all_users', 'zh', '全部用户'),
    ('filter_all_actions', 'zh', '全部操作'),
    ('filter_all_resources', 'zh', '全部资源'),
    ('filter_login', 'zh', '登录'),
    ('filter_logout', 'zh', '退出'),
    ('filter_upload', 'zh', '上传'),
    ('filter_delete', 'zh', '删除'),
    ('filter_update', 'zh', '更新'),
    ('filter_create', 'zh', '创建'),
    ('filter_auth', 'zh', '认证'),
    ('filter_gallery', 'zh', '图库'),
    ('filter_files', 'zh', '文件'),
    ('filter_content', 'zh', '内容'),
    ('filter_config_res', 'zh', '配置'),
    ('btn_filter', 'zh', '筛选'),
    ('btn_export_csv', 'zh', '导出 CSV'),
    ('btn_prev', 'zh', '上一页'),
    ('btn_next', 'zh', '下一页'),
    ('log_click_filter', 'zh', '点击筛选加载日志'),
    ('log_loading', 'zh', '加载中...'),
    ('log_no_records', 'zh', '无记录'),
    ('log_records_found', 'zh', '条记录'),
    ('log_accept_nda', 'zh', '接受协议'),
    ('col_details', 'zh', '详情'),
    ('render_error', 'zh', '页面渲染出错。')
ON CONFLICT (key, language_code) DO NOTHING;

-- ─── 3. LOCALE CONTENT ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS locale_content (
    id           BIGSERIAL PRIMARY KEY,
    language_code VARCHAR(5) NOT NULL REFERENCES languages(code) ON DELETE CASCADE,
    section_path VARCHAR(200) NOT NULL,    -- 'sections.team_react.scope'
    content      JSONB NOT NULL DEFAULT '{}',
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_by   VARCHAR(100),
    UNIQUE(language_code, section_path)
);
CREATE INDEX IF NOT EXISTS idx_locale_lang_path ON locale_content(language_code, section_path);

-- Seed empty locale content structure for EN and ZH
-- (Content populated via HUB Assist or admin UI after deployment)
INSERT INTO locale_content (language_code, section_path, content) VALUES
    ('en', 'sections', '{}'),
    ('en', 'sections.overview', '{}'),
    ('zh', 'sections', '{}'),
    ('zh', 'sections.overview', '{}')
ON CONFLICT (language_code, section_path) DO NOTHING;

-- ─── 4. USERS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id               BIGSERIAL PRIMARY KEY,
    username         VARCHAR(100) UNIQUE NOT NULL,
    email            VARCHAR(200),
    password_hash    VARCHAR(255) NOT NULL,
    first_name       VARCHAR(100),
    last_name        VARCHAR(100),
    role             VARCHAR(20) NOT NULL DEFAULT 'viewer',  -- superadmin, admin, viewer
    teams            TEXT[] DEFAULT '{}',
    can_view_activity BOOLEAN DEFAULT FALSE,
    is_active        BOOLEAN DEFAULT TRUE,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW(),
    last_login       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Seed default superadmin (password: RaossAdmin2024!)
-- BCrypt hash of "RaossAdmin2024!" rounds=12
INSERT INTO users (username, email, password_hash, first_name, last_name, role, teams, can_view_activity, is_active)
VALUES (
    'admin',
    'admin@raoss.com',
    '$2b$12$BRs./aV7KbhMHY3P8gQdVeB/jkt9RKgjnm9RBGAz1VdPdCXgqGEli',
    'RAOSS',
    'Admin',
    'superadmin',
    ARRAY['all'],
    true,
    true
)
ON CONFLICT (username) DO NOTHING;

-- Seed default user (password: RaossUser2024!)
INSERT INTO users (username, email, password_hash, first_name, last_name, role, teams, can_view_activity, is_active)
VALUES (
    'rizan',
    'rizan@raoss.com',
    '$2b$12$IPFc09d1paaQLGUvFGUkDuo6qBqacIFQKWW56spO88nHU3AtGegpO',
    'Rizan',
    'User',
    'user',
    ARRAY['all'],
    false,
    true
)
ON CONFLICT (username) DO NOTHING;

-- ─── 5. PASSWORD RESET TOKENS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used       BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reset_token ON password_reset_tokens(token);

-- ─── 6. NDA AGREEMENTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nda_agreements (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agreed_at  TIMESTAMPTZ DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT,
    UNIQUE(user_id)
);

-- ─── 7. TEAMS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
    id         BIGSERIAL PRIMARY KEY,
    team_id    VARCHAR(50) UNIQUE NOT NULL,    -- 'react', 'pcba', 'firmware'
    name_en    VARCHAR(100) NOT NULL,
    name_zh    VARCHAR(100),
    icon       VARCHAR(50),                    -- matches icon key
    sort_order INT DEFAULT 0,
    is_active  BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_teams_team_id ON teams(team_id);

INSERT INTO teams (team_id, name_en, name_zh, icon, sort_order) VALUES
    ('react', 'React (App)', 'React（应用）', 'react', 1),
    ('pcba', 'PCBA', 'PCBA', 'pcba', 2),
    ('firmware', 'Firmware', '固件', 'firmware', 3),
    ('tft', 'TFT Display', 'TFT 显示', 'tft', 4),
    ('router', 'Router / Wi-Fi', '路由器 / Wi-Fi', 'router', 5),
    ('charger', 'Charger / Power', '充电器 / 电源', 'charger', 6),
    ('shell', 'Mechanical Shell', '机械外壳', 'shell', 7)
ON CONFLICT (team_id) DO NOTHING;

-- ─── 8. PROJECT CONFIG ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_config (
    id         BIGSERIAL PRIMARY KEY,
    config     JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(100)
);

-- Seed default config matching v2 defaults
INSERT INTO project_config (config) VALUES (
    '{
        "identity": {
            "name": "RAOSS Hub",
            "chip": "",
            "version": "3.0",
            "status": "In Development",
            "description": "",
            "startDate": "",
            "targetDate": "",
            "updatedLabel": "",
            "githubUrl": "",
            "refLink1": "",
            "refLink2": "",
            "icpEn": "",
            "icpZh": ""
        },
        "branding": {
            "logoFile": "logo.png",
            "model3dFile": "",
            "favicon": "favicon.ico"
        },
        "api": {
            "maxScreenshots": 3,
            "proxyUrl": "http://localhost:3001"
        }
    }'::jsonb
)
ON CONFLICT DO NOTHING;

-- ─── 9. AUDIT LOG ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
    username   VARCHAR(100),
    action     VARCHAR(50) NOT NULL,     -- login, logout, upload, delete, update, create, accept
    resource   VARCHAR(50) NOT NULL,     -- auth, locales, teams, pdf, gallery, files, config, users
    record_id  BIGINT,
    detail_en  TEXT,
    detail_zh  TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_log(resource);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);

-- ─── 10. CHAT SUMMARIES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_summaries (
    id            BIGSERIAL PRIMARY KEY,
    team_id       VARCHAR(50) NOT NULL,
    title         VARCHAR(500),
    summary_text  TEXT,
    decisions     TEXT[] DEFAULT '{}',
    actions       TEXT[] DEFAULT '{}',
    blockers      TEXT[] DEFAULT '{}',
    analysed_by_insight BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_team ON chat_summaries(team_id);
CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_summaries(created_at DESC);

-- ─── 11. PDF DOCUMENTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pdf_documents (
    id         BIGSERIAL PRIMARY KEY,
    team_id    VARCHAR(50) NOT NULL,
    title      VARCHAR(500) NOT NULL,
    file_name  VARCHAR(500),
    file_size  BIGINT,
    mime_type  VARCHAR(100),
    s3_key     VARCHAR(500),
    s3_bucket  VARCHAR(100),
    is_active  BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS idx_pdf_team ON pdf_documents(team_id);

-- ─── 12. PDF VERSIONS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pdf_versions (
    id            BIGSERIAL PRIMARY KEY,
    document_id   BIGINT NOT NULL REFERENCES pdf_documents(id) ON DELETE CASCADE,
    version       VARCHAR(50) NOT NULL,
    s3_key        VARCHAR(500),
    s3_bucket     VARCHAR(100),
    raw_text      TEXT,
    was_translated BOOLEAN DEFAULT FALSE,
    current_sections JSONB DEFAULT '[]',
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    created_by    VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS idx_pdf_ver_doc ON pdf_versions(document_id);

-- ─── 13. GALLERY IMAGES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gallery_images (
    id         BIGSERIAL PRIMARY KEY,
    team_id    VARCHAR(50) NOT NULL,
    file_name  VARCHAR(500),
    s3_key     VARCHAR(500),
    s3_bucket  VARCHAR(100),
    s3_url     VARCHAR(1000),
    file_size  BIGINT,
    mime_type  VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS idx_gallery_team ON gallery_images(team_id);

-- ─── 14. TEAM FILES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_files (
    id         BIGSERIAL PRIMARY KEY,
    team_id    VARCHAR(50) NOT NULL,
    file_name  VARCHAR(500) NOT NULL,
    s3_key     VARCHAR(500),
    s3_bucket  VARCHAR(100),
    s3_url     VARCHAR(1000),
    file_size  BIGINT,
    mime_type  VARCHAR(100),
    uploaded_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_files_team ON team_files(team_id);

-- ─── 15. TRANSLATION JOBS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS translation_jobs (
    id           BIGSERIAL PRIMARY KEY,
    source_lang  VARCHAR(5) NOT NULL,
    target_lang  VARCHAR(5) NOT NULL,
    section_path VARCHAR(200) NOT NULL,
    status       VARCHAR(20) DEFAULT 'pending',  -- pending, in_progress, completed, failed
    started_at   TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trans_status ON translation_jobs(status);

-- ─── Done ──────────────────────────────────────────────────────


-- Write permissions for application user raoss
-- Required for DataInitializer and seed scripts to INSERT/UPDATE.
-- Placed at end of schema.sql so all tables exist before grants run.
GRANT USAGE ON SCHEMA public TO raoss;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO raoss;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO raoss;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO raoss;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO raoss;
