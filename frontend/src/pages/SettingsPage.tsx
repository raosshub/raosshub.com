import React, { useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useI18nStore } from '@/stores/useI18nStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { Icons } from '@/components/icons';
import type { User } from '@/types';

const SettingsPage: React.FC = () => {
  const { t, currentLang, setLanguage } = useI18nStore();
  const { theme, toggleTheme } = useThemeStore();
  const { user } = useAuthStore();
  const { addToast } = useNotificationStore();

  const u = user as User;
  const isSuperAdmin = u?.role === 'superadmin';

  const roleColors: Record<string, { bg: string; text: string }> = {
    superadmin: { bg: 'var(--super-dim)', text: 'var(--super-admin)' },
    admin: { bg: 'var(--orange-dim)', text: 'var(--orange)' },
    viewer: { bg: 'var(--blue-dim)', text: 'var(--blue)' },
  };
  const roleStyle = roleColors[u?.role] || roleColors.viewer;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
        {t('settings_title')}
      </h1>

      {/* Profile Card */}
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '20px 24px',
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: 16,
          }}
        >
          {t('settings_profile')}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
          {/* Avatar */}
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: '50%',
              background: 'var(--accent-dim)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              fontWeight: 700,
              flexShrink: 0,
              cursor: 'pointer',
              transition: 'transform var(--transition)',
            }}
          >
            {(u?.firstName?.[0] || u?.username?.[0] || '?').toUpperCase()}
          </div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
              {u?.firstName} {u?.lastName}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
              {u?.email || u?.username}
            </div>
            <div
              style={{
                display: 'inline-flex',
                marginTop: 8,
                padding: '2px 8px',
                borderRadius: 99,
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
                background: roleStyle.bg,
                color: roleStyle.text,
              }}
            >
              {u?.role}
            </div>
          </div>
        </div>
      </div>

      {/* Appearance Card */}
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '20px 24px',
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: 16,
          }}
        >
          {t('settings_appearance')}
        </div>

        {/* Language */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            padding: '14px 0',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {t('settings_language')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {currentLang === 'en' ? t('settings_lang_en') : t('settings_lang_zh')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setLanguage('en')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: currentLang === 'en' ? '1px solid var(--text-primary)' : '1px solid var(--border)',
                background: currentLang === 'en' ? 'var(--text-primary)' : 'none',
                color: currentLang === 'en' ? 'var(--bg-base)' : 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all var(--transition)',
              }}
            >
              {t('settings_lang_en')}
            </button>
            <button
              onClick={() => setLanguage('zh')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: currentLang === 'zh' ? '1px solid var(--text-primary)' : '1px solid var(--border)',
                background: currentLang === 'zh' ? 'var(--text-primary)' : 'none',
                color: currentLang === 'zh' ? 'var(--bg-base)' : 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all var(--transition)',
              }}
            >
              {t('settings_lang_zh')}
            </button>
          </div>
        </div>

        {/* Theme */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            padding: '14px 0',
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {t('settings_theme')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {theme === 'dark' ? t('settings_theme_dark') : t('settings_theme_light')}
            </div>
          </div>
          <button
            onClick={toggleTheme}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'none',
              color: 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all var(--transition)',
            }}
          >
            {theme === 'dark' ? <Icons.sun size={14} /> : <Icons.moon size={14} />}
            {theme === 'dark' ? t('settings_switch_light') : t('settings_switch_dark')}
          </button>
        </div>
      </div>

      {/* Super Admin: Project Config link */}
      {isSuperAdmin && (
        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '20px 24px',
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              color: 'var(--super-admin)',
              marginBottom: 16,
            }}
          >
            SUPER ADMIN
          </div>
          <a
            href="#/project-config"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'var(--bg-overlay)',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              textDecoration: 'none',
              transition: 'all var(--transition)',
            }}
          >
            <Icons.settings size={16} />
            {t('tool_project_config')}
          </a>
        </div>
      )}
    </div>
  );
};

export default React.memo(SettingsPage);
