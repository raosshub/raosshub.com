import React, { useState, useCallback, useEffect } from 'react';
import { useAuthStore }  from '@/stores/useAuthStore';
import { useI18nStore }  from '@/stores/useI18nStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { Icons }         from '@/components/icons';
import { authApi }       from '@/utils/api';

interface LoginScreenProps {
  // When true: renders only the dark background + mesh grid — no card, no form.
  // Used in the 'nda' init stage as a visual backdrop for NDAModal.
  // Chrome autofill detects <input> elements regardless of z-index; the only
  // reliable fix is to not have inputs in the DOM.
  backdropOnly?: boolean;
}

// Three views within the login screen, controlled by URL and user interaction.
// Language selection applies to all three — t() always uses currentLang.
type LoginView = 'login' | 'forgot' | 'reset';

const LoginScreen: React.FC<LoginScreenProps> = ({ backdropOnly = false }) => {
  const { login }                                  = useAuthStore();
  const { t, currentLang, setLanguage, languages } = useI18nStore();
  const { theme, toggleTheme }                     = useThemeStore();

  // ── Detect reset token in URL on first render ─────────────────────────────
  const [view, setView] = useState<LoginView>(() => {
    const p = new URLSearchParams(window.location.search);
    return p.has('reset') ? 'reset' : 'login';
  });
  const [resetToken] = useState<string>(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get('reset') || '';
  });

  // ── Login view state ──────────────────────────────────────────────────────
  const [username,     setUsername]     = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember,     setRemember]     = useState(false);
  const [loginError,   setLoginError]   = useState('');
  const [isLoading,    setIsLoading]    = useState(false);

  // ── Forgot password view state ────────────────────────────────────────────
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotLoading,  setForgotLoading]  = useState(false);
  const [forgotDone,     setForgotDone]     = useState(false);
  const [forgotError,    setForgotError]    = useState('');

  // ── Reset password view state ─────────────────────────────────────────────
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPwd,      setShowNewPwd]      = useState(false);
  const [resetLoading,    setResetLoading]    = useState(false);
  const [resetDone,       setResetDone]       = useState(false);
  const [resetError,      setResetError]      = useState('');

  const EyeIcon    = showPassword ? Icons.eye : Icons.eyeOff;
  const EyeIconNew = showNewPwd   ? Icons.eye : Icons.eyeOff;

  // Clear reset token from URL history so the browser back button and URL bar
  // don't expose it. Must run once on mount.
  useEffect(() => {
    if (window.location.search.includes('reset=')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleLoginSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!username.trim() || !password) {
      setLoginError(t('login_err_empty', 'Please fill in all fields.'));
      return;
    }
    setIsLoading(true);
    const success = await login(username.trim(), password);
    setIsLoading(false);
    if (!success) setLoginError(t('login_err_invalid', 'Invalid credentials. Please try again.'));
  }, [username, password, login, t]);

  const handleForgotSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    if (!forgotUsername.trim()) {
      setForgotError(t('forgot_err_empty', 'Please enter your username.'));
      return;
    }
    setForgotLoading(true);
    try {
      // currentLang is passed so the backend sends the email in the user's language
      await authApi.forgotPassword(forgotUsername.trim(), currentLang);
    } catch {
      // Always show success — never reveal whether the account exists (v2 behaviour)
    }
    setForgotDone(true);
    setForgotLoading(false);
  }, [forgotUsername, currentLang, t]);

  const handleResetSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (!newPassword || !confirmPassword) {
      setResetError(t('reset_err_empty', 'Please enter and confirm your new password.'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError(t('reset_err_mismatch', 'Passwords do not match.'));
      return;
    }
    if (newPassword.length < 8 ||
        !/[a-zA-Z]/.test(newPassword) ||
        !/[0-9]/.test(newPassword)) {
      setResetError(t('reset_err_weak', 'Password must be at least 8 characters with letters and numbers.'));
      return;
    }
    setResetLoading(true);
    try {
      await authApi.resetPassword(resetToken, newPassword);
      setResetDone(true);
      // Auto-return to login after 2.5s — matches v2 behaviour
      setTimeout(() => { setView('login'); setResetDone(false); }, 2500);
    } catch {
      setResetError(t('reset_err_expired', 'This reset link has expired or has already been used.'));
    }
    setResetLoading(false);
  }, [newPassword, confirmPassword, resetToken, t]);

  // ── Shared input style ────────────────────────────────────────────────────
  const inputSt: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)', background: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: 13, outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.15s ease',
  };
  const labelSt: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
    letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: 5,
  };
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.target.style.borderColor = 'var(--border-focus)');
  const onBlur  = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.target.style.borderColor = 'var(--border)');

  // ── Backdrop-only mode ────────────────────────────────────────────────────
  if (backdropOnly) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-base)', zIndex: 1000 }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `linear-gradient(var(--border-subtle) 1px, transparent 1px),
                            linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)`,
          backgroundSize: '40px 40px', opacity: 0.4,
          maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)',
        }} />
      </div>
    );
  }

  // ── Shared layout ─────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-base)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>

      {/* Background mesh grid */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(var(--border-subtle) 1px, transparent 1px),
                          linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)`,
        backgroundSize: '40px 40px', opacity: 0.4,
        maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)' }} />

      {/* Card */}
      <div style={{ position: 'relative', background: 'var(--bg-elevated)',
        border: '1px solid var(--border)', borderRadius: 14, width: '100%',
        maxWidth: 420, padding: '44px 40px', boxShadow: 'var(--shadow-lg)',
        animation: 'fadeUp 0.4s ease' }}>

        {/* ── VIEW: LOGIN ─────────────────────────────────────────────── */}
        {view === 'login' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8,
                background: 'var(--accent-dim)', color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 18, border: '1px solid rgba(63,185,80,0.3)' }}>R</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                  {t('login_title', 'Sign In')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {t('login_subtitle', 'Enter your credentials to continue')}
                </div>
              </div>
            </div>

            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelSt}>{t('login_username', 'Username')}</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                  autoComplete="username" autoFocus
                  placeholder={t('login_username_placeholder', 'Enter your username')}
                  style={inputSt} onFocus={onFocus} onBlur={onBlur} />
              </div>

              <div>
                <label style={labelSt}>{t('login_password', 'Password')}</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder={t('login_password_placeholder', 'Enter your password')}
                    style={{ ...inputSt, paddingRight: 40 }} onFocus={onFocus} onBlur={onBlur} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 10, top: '50%',
                      transform: 'translateY(-50%)', background: 'none', border: 'none',
                      color: 'var(--text-muted)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', padding: 2 }}>
                    <EyeIcon size={16} />
                  </button>
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer', userSelect: 'none' }}>
                <span onClick={() => setRemember(!remember)}
                  style={{ width: 16, height: 16,
                    border: `1.5px solid ${remember ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 4, background: remember ? 'var(--accent)' : 'var(--bg-input)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontSize: 10, color: 'white', fontWeight: 700,
                    transition: 'all var(--transition)', cursor: 'pointer' }}>
                  {remember ? '✓' : ''}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {t('login_remember', 'Remember me')}
                </span>
              </label>

              <button type="submit" disabled={isLoading}
                style={{ width: '100%', padding: '12px 20px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent)', color: 'var(--text-inverse)', fontSize: 14,
                  fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer',
                  border: 'none', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 8, letterSpacing: '0.2px',
                  opacity: isLoading ? 0.7 : 1, transition: 'opacity var(--transition)' }}>
                {isLoading ? '...' : t('login_btn', 'Sign In')}
                {!isLoading && <span style={{ fontSize: 16 }}>→</span>}
              </button>

              {loginError && (
                <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 4, fontWeight: 500 }}>
                  {loginError}
                </div>
              )}
            </form>

            {/* Forgot password link */}
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button type="button" onClick={() => { setForgotUsername(''); setForgotDone(false); setForgotError(''); setView('forgot'); }}
                style={{ background: 'none', border: 'none', color: 'var(--accent)',
                  fontSize: 12, cursor: 'pointer', padding: '2px 0',
                  textDecoration: 'underline', textDecorationStyle: 'dotted',
                  textUnderlineOffset: 3 }}>
                {t('login_forgot', 'Forgot password?')}
              </button>
            </div>
          </>
        )}

        {/* ── VIEW: FORGOT PASSWORD ────────────────────────────────────── */}
        {view === 'forgot' && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
                {t('forgot_title', 'Reset Password')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {t('forgot_subtitle', 'Enter your username to receive a reset link.')}
              </div>
            </div>

            {!forgotDone ? (
              <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelSt}>{t('login_username', 'Username')}</label>
                  <input type="text" value={forgotUsername}
                    onChange={e => setForgotUsername(e.target.value)}
                    autoComplete="username" autoFocus
                    placeholder={t('login_username_placeholder', 'Enter your username')}
                    style={inputSt} onFocus={onFocus} onBlur={onBlur} />
                </div>

                <button type="submit" disabled={forgotLoading}
                  style={{ width: '100%', padding: '12px 20px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--accent)', color: 'var(--text-inverse)', fontSize: 14,
                    fontWeight: 600, cursor: forgotLoading ? 'not-allowed' : 'pointer',
                    border: 'none', opacity: forgotLoading ? 0.7 : 1,
                    transition: 'opacity var(--transition)' }}>
                  {forgotLoading ? '...' : t('forgot_btn', 'Send Reset Link')}
                </button>

                {forgotError && (
                  <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 500 }}>
                    {forgotError}
                  </div>
                )}
              </form>
            ) : (
              <div style={{ padding: '16px 0', textAlign: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%',
                  background: 'var(--accent-dim)', margin: '0 auto 14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, color: 'var(--accent)' }}>✓</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  {t('forgot_success',
                    'If the account exists, a reset link has been sent to the registered email.')}
                </div>
              </div>
            )}

            <button type="button" onClick={() => setView('login')}
              style={{ marginTop: 18, background: 'none', border: 'none',
                color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer',
                padding: '2px 0', display: 'block', width: '100%', textAlign: 'center' }}>
              {t('forgot_back', '← Back to Sign In')}
            </button>
          </>
        )}

        {/* ── VIEW: RESET PASSWORD ─────────────────────────────────────── */}
        {view === 'reset' && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
                {t('reset_title', 'Set New Password')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {t('reset_subtitle', 'Enter and confirm your new password.')}
              </div>
            </div>

            {!resetDone ? (
              <form onSubmit={handleResetSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                <div>
                  <label style={labelSt}>{t('reset_label_pwd', 'New Password')}</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showNewPwd ? 'text' : 'password'} value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      autoComplete="new-password" autoFocus
                      placeholder={t('reset_placeholder_pwd',
                        'Min. 8 characters with letters and numbers')}
                      style={{ ...inputSt, paddingRight: 40 }} onFocus={onFocus} onBlur={onBlur} />
                    <button type="button" onClick={() => setShowNewPwd(!showNewPwd)}
                      style={{ position: 'absolute', right: 10, top: '50%',
                        transform: 'translateY(-50%)', background: 'none', border: 'none',
                        color: 'var(--text-muted)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', padding: 2 }}>
                      <EyeIconNew size={16} />
                    </button>
                  </div>
                </div>

                <div>
                  <label style={labelSt}>{t('reset_label_confirm', 'Confirm Password')}</label>
                  <input type="password" value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder={t('reset_placeholder_confirm', 'Repeat new password')}
                    style={inputSt} onFocus={onFocus} onBlur={onBlur} />
                </div>

                <button type="submit" disabled={resetLoading}
                  style={{ width: '100%', padding: '12px 20px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--accent)', color: 'var(--text-inverse)', fontSize: 14,
                    fontWeight: 600, cursor: resetLoading ? 'not-allowed' : 'pointer',
                    border: 'none', opacity: resetLoading ? 0.7 : 1,
                    transition: 'opacity var(--transition)' }}>
                  {resetLoading ? '...' : t('reset_btn', 'Reset Password')}
                </button>

                {resetError && (
                  <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 500 }}>
                    {resetError}
                  </div>
                )}
              </form>
            ) : (
              <div style={{ padding: '16px 0', textAlign: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%',
                  background: 'var(--accent-dim)', margin: '0 auto 14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, color: 'var(--accent)' }}>✓</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  {t('reset_success', 'Password updated. You can now sign in.')}
                </div>
              </div>
            )}

            {!resetDone && (
              <button type="button" onClick={() => setView('login')}
                style={{ marginTop: 18, background: 'none', border: 'none',
                  color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer',
                  padding: '2px 0', display: 'block', width: '100%', textAlign: 'center' }}>
                {t('reset_back', '← Back to Sign In')}
              </button>
            )}
          </>
        )}

        {/* ── Shared footer: divider + language + theme ─────────────────── */}
        <div style={{ height: 1, background: 'var(--border)', margin: '24px 0 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          {languages.filter(l => l.isActive).length > 1 && (
            <select value={currentLang} onChange={e => setLanguage(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: 99,
                border: '1px solid var(--border)', fontSize: 12, fontWeight: 600,
                color: 'var(--text-secondary)', background: 'var(--bg-overlay)',
                cursor: 'pointer', outline: 'none' }}>
              {languages.filter(l => l.isActive).map(l => (
                <option key={l.code} value={l.code}>
                  {l.nameNative} ({l.code.toUpperCase()})
                </option>
              ))}
            </select>
          )}
          <button onClick={toggleTheme}
            style={{ padding: '5px 12px', borderRadius: 99,
              border: '1px solid var(--border)', fontSize: 12, fontWeight: 600,
              color: 'var(--text-secondary)', background: 'var(--bg-overlay)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {theme === 'dark' ? <Icons.sun size={14} /> : <Icons.moon size={14} />}
            {theme === 'dark'
              ? t('tool_theme_light', 'Light Mode')
              : t('tool_theme_dark',  'Dark Mode')}
          </button>
        </div>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
          {`© ${new Date().getFullYear()} RAOSS HK COMPANY LIMITED`}
        </div>

      </div>
    </div>
  );
};

export default React.memo(LoginScreen);
