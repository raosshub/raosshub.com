import React, { useState, useCallback } from 'react';
import { useAuthStore }  from '@/stores/useAuthStore';
import { useI18nStore }  from '@/stores/useI18nStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { Icons }         from '@/components/icons';

interface LoginScreenProps {
  // When true: renders only the dark background + mesh grid.
  // No card, no form, no inputs. Used in the 'nda' init stage so the login
  // screen acts as a visual backdrop for NDAModal without any input fields
  // in the DOM. Chrome's autofill system detects <input> elements and shows
  // its native suggestion overlay at OS z-level regardless of z-index, inert,
  // or pointer-events — the only reliable fix is to not have inputs in the DOM.
  backdropOnly?: boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ backdropOnly = false }) => {
  const { login }                                  = useAuthStore();
  const { t, currentLang, setLanguage, languages } = useI18nStore();
  const { theme, toggleTheme }                     = useThemeStore();

  const [username,     setUsername]     = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember,     setRemember]     = useState(false);
  const [error,        setError]        = useState('');
  const [isLoading,    setIsLoading]    = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError(t('login_err_empty', 'Please enter your username and password'));
      return;
    }
    setIsLoading(true);
    const success = await login(username.trim(), password);
    setIsLoading(false);
    if (!success) setError(t('login_err_invalid', 'Invalid username or password'));
  }, [username, password, login, t]);

  const EyeIcon = showPassword ? Icons.eye : Icons.eyeOff;

  // ── Backdrop-only mode ────────────────────────────────────────────────────
  // Render only the background shell — identical outer wrapper + mesh grid
  // as the full login screen so the visual is consistent. No card, no form.
  if (backdropOnly) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-base)', zIndex: 1000 }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `linear-gradient(var(--border-subtle) 1px, transparent 1px),
                            linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          opacity: 0.4,
          maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)',
        }} />
      </div>
    );
  }

  // ── Full login screen ─────────────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-base)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>

      {/* Background grid */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)`, backgroundSize: '40px 40px', opacity: 0.4, maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)' }} />

      <div style={{ position: 'relative', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 420, padding: '44px 40px', boxShadow: 'var(--shadow-lg)', animation: 'fadeUp 0.4s ease' }}>

        {/* Logo + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--accent-dim)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, border: '1px solid rgba(63,185,80,0.3)' }}>
            R
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {t('login_title', 'Sign In')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {t('login_subtitle', 'Enter your credentials to continue')}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Username */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>
              {t('login_username', 'Username')}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              placeholder={t('login_username_placeholder', 'Enter your username')}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s ease' }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--border-focus)'; }}
              onBlur={(e)  => { e.target.style.borderColor = 'var(--border)'; }}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>
              {t('login_password', 'Password')}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder={t('login_password_placeholder', 'Enter your password')}
                style={{ width: '100%', padding: '10px 40px 10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s ease' }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--border-focus)'; }}
                onBlur={(e)  => { e.target.style.borderColor = 'var(--border)'; }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }}
              >
                <EyeIcon size={16} />
              </button>
            </div>
          </div>

          {/* Remember me */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
            <span
              onClick={() => setRemember(!remember)}
              style={{ width: 16, height: 16, border: `1.5px solid ${remember ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 4, background: remember ? 'var(--accent)' : 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, color: 'white', fontWeight: 700, transition: 'all var(--transition)', cursor: 'pointer' }}
            >
              {remember ? '✓' : ''}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {t('login_remember', 'Remember me')}
            </span>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            style={{ width: '100%', padding: '12px 20px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: 'var(--text-inverse)', fontSize: 14, fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '0.2px', opacity: isLoading ? 0.7 : 1, transition: 'opacity var(--transition)' }}
          >
            {isLoading ? '...' : t('login_btn', 'Sign In')}
            {!isLoading && <span style={{ fontSize: 16 }}>→</span>}
          </button>

          {error && (
            <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 4, fontWeight: 500 }}>
              {error}
            </div>
          )}
        </form>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)', margin: '24px 0 16px' }} />

        {/* Language dropdown + theme toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>

          {languages.filter((l) => l.isActive).length > 1 && (
            <select
              value={currentLang}
              onChange={(e) => setLanguage(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: 99, border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-overlay)', cursor: 'pointer', outline: 'none' }}
            >
              {languages
                .filter((l) => l.isActive)
                .map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nameNative} ({l.code.toUpperCase()})
                  </option>
                ))}
            </select>
          )}

          <button
            onClick={toggleTheme}
            style={{ padding: '5px 12px', borderRadius: 99, border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-overlay)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {theme === 'dark' ? <Icons.sun size={14} /> : <Icons.moon size={14} />}
            {theme === 'dark'
              ? t('tool_theme_light', 'Light Mode')
              : t('tool_theme_dark',  'Dark Mode')}
          </button>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
          {`© ${new Date().getFullYear()} RAOSS HK COMPANY LIMITED`}
        </div>

      </div>
    </div>
  );
};

export default React.memo(LoginScreen);
