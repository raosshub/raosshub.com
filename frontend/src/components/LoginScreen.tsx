import React, { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useI18nStore } from '@/stores/useI18nStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { Icons } from '@/components/icons';

const LoginScreen: React.FC = () => {
  const { t } = useI18nStore();
  const { login } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { addToast } = useNotificationStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (!email.trim() || !password) {
        setError(t('login_err_empty'));
        return;
      }

      setIsLoading(true);
      const success = await login(email.trim(), password);
      setIsLoading(false);

      if (!success) {
        setError(t('login_err_invalid'));
      }
    },
    [email, password, login, t]
  );

  const EyeIcon = showPassword ? Icons.eye : Icons.eyeOff;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg-base)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      {/* Background grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: `linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          opacity: 0.4,
          maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)',
        }}
      />

      <div
        style={{
          position: 'relative',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          width: '100%',
          maxWidth: 420,
          padding: '44px 40px',
          boxShadow: 'var(--shadow-lg)',
          animation: 'fadeUp 0.4s ease',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: 'var(--accent-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            R
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            RAOSS <span style={{ color: 'var(--accent)' }}>Hub</span>
          </div>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.3 }}>
          {t('login_title')}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 28 }}>
          {t('login_subtitle')}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: 7,
                letterSpacing: '0.3px',
                textTransform: 'uppercase',
              }}
            >
              {t('login_label_email')}
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@raoss.com"
              autoComplete="username"
              style={{
                width: '100%',
                padding: '11px 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                fontSize: 14,
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                outline: 'none',
                transition: 'border-color var(--transition), box-shadow var(--transition)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-focus)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(88,166,255,0.15)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: 7,
                letterSpacing: '0.3px',
                textTransform: 'uppercase',
              }}
            >
              {t('login_label_password')}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '11px 44px 11px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  fontSize: 14,
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  transition: 'border-color var(--transition)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-focus)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(88,166,255,0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <EyeIcon size={16} />
              </button>
            </div>
          </div>

          {/* Remember me */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 22 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                fontSize: 13,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{ display: 'none' }}
              />
              <span
                style={{
                  width: 16,
                  height: 16,
                  border: remember ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                  borderRadius: 4,
                  background: remember ? 'var(--accent)' : 'var(--bg-input)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all var(--transition)',
                  flexShrink: 0,
                  fontSize: 10,
                  color: 'white',
                  fontWeight: 700,
                }}
              >
                {remember ? '✓' : ''}
              </span>
              {t('login_remember')}
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px 20px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent)',
              color: 'var(--text-inverse)',
              fontSize: 14,
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              letterSpacing: '0.2px',
              opacity: isLoading ? 0.7 : 1,
              transition: 'opacity var(--transition), transform var(--transition)',
            }}
          >
            {isLoading ? '...' : t('login_btn')}
            {!isLoading && <span style={{ fontSize: 16 }}>→</span>}
          </button>

          {error && (
            <div
              style={{
                color: 'var(--red)',
                fontSize: 13,
                marginTop: 12,
                minHeight: 18,
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}
        </form>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)', margin: '24px 0 16px' }} />

        {/* Theme toggle */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={toggleTheme}
            style={{
              padding: '4px 12px',
              borderRadius: 99,
              border: '1px solid var(--border)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              background: 'var(--bg-overlay)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {theme === 'dark' ? <Icons.sun size={14} /> : <Icons.moon size={14} />}
            {theme === 'dark' ? t('tool_theme_light') : t('tool_theme_dark')}
          </button>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 24,
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--text-muted)',
          }}
        >
          © 2026 RAOSS HK COMPANY LIMITED
        </div>
      </div>
    </div>
  );
};

export default React.memo(LoginScreen);
