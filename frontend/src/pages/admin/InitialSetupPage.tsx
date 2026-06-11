import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18nStore }   from '@/stores/useI18nStore';
import { useConfigStore } from '@/stores/useConfigStore';
import { adminApi, configApi, languageApi, kimiApi } from '@/utils/api';
import { Icons } from '@/components/icons';
import type { Language } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────
type SetupStep  = 1 | 2 | 3 | 4;
type TaskStatus = 'pending' | 'running' | 'done' | 'skipped' | 'error';

interface SetupTask {
  id:     string;
  label:  string;
  status: TaskStatus;
  error?: string;
}

interface Props {
  onComplete: () => void;
}

// ─── Stepper ──────────────────────────────────────────────────────────────────
function Stepper({ current, t }: { current: SetupStep; t: (k: string, f?: string) => string }) {
  const steps = [
    { n: 1 as const, key: 'setup_s1_label', fb: 'Admin Account'    },
    { n: 2 as const, key: 'setup_s2_label', fb: 'Default Language' },
    { n: 3 as const, key: 'setup_s3_label', fb: 'AI Translation'   },
    { n: 4 as const, key: 'setup_s4_label', fb: 'Ready'            },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 32 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 70 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, flexShrink: 0, transition: 'all 0.3s',
              background: s.n < current ? '#059669' : s.n === current ? 'var(--accent)' : 'var(--bg-overlay)',
              color:      s.n <= current ? 'white' : 'var(--text-muted)',
              border:     s.n > current ? '1px solid var(--border)' : 'none',
            }}>
              {s.n < current ? '\u2713' : s.n}
            </div>
            <span style={{
              fontSize: 10, fontWeight: s.n === current ? 700 : 400, textAlign: 'center',
              color: s.n < current ? '#059669' : s.n === current ? 'var(--text-primary)' : 'var(--text-muted)',
              lineHeight: 1.3,
            }}>
              {t(s.key, s.fb)}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              flex: 1, height: 2, marginTop: 16, transition: 'background 0.3s',
              background: current > s.n ? '#059669' : 'var(--border)',
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const inputSt: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)', background: 'var(--bg-input)',
  color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
};
const labelSt: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
  letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 5, display: 'block',
};
const primaryBtn = (disabled: boolean): React.CSSProperties => ({
  padding: '10px 24px', borderRadius: 'var(--radius-sm)', border: 'none',
  background: disabled ? 'var(--bg-overlay)' : 'var(--accent)',
  color:      disabled ? 'var(--text-muted)' : 'var(--text-inverse)',
  fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
});
const ghostBtn: React.CSSProperties = {
  padding: '10px 18px', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)', background: 'none',
  color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
};
const spinnerSt: React.CSSProperties = {
  width: 14, height: 14, borderRadius: '50%',
  border: '2px solid var(--accent)', borderTopColor: 'transparent',
  animation: 'spin 0.8s linear infinite', display: 'inline-block', flexShrink: 0,
};

function TaskIcon({ status }: { status: TaskStatus }) {
  if (status === 'running') return <span style={spinnerSt} />;
  if (status === 'done')    return <span style={{ fontSize: 15, color: '#059669', fontWeight: 700 }}>{'\u2713'}</span>;
  if (status === 'error')   return <span style={{ fontSize: 15, color: 'var(--red)', fontWeight: 700 }}>{'\u2717'}</span>;
  if (status === 'skipped') return <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{'\u2014'}</span>;
  return <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--border)', display: 'inline-block', flexShrink: 0 }} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function InitialSetupPage({ onComplete }: Props) {
  const navigate    = useNavigate();
  const { t, loadLanguages, loadUiStrings } = useI18nStore();
  const { load: loadConfig }                = useConfigStore();

  const [step, setStep] = useState<SetupStep>(1);

  // ── Step 1 ────────────────────────────────────────────────────────────────
  // adminEmail is used as BOTH the login username AND the email address,
  // matching the main site where username = email (required for forgot password).
  const [adminEmail, setAdminEmail] = useState('');
  const [password,   setPassword]   = useState('');
  const [confirm,    setConfirm]    = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [showConf,   setShowConf]   = useState(false);
  const [s1Errors,   setS1Errors]   = useState<{ username?: string; password?: string; confirm?: string }>({});

  const handleS1Continue = useCallback(() => {
    const errs: typeof s1Errors = {};
    if (!adminEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail.trim())) {
      errs.username = t('setup_s1_err_email', 'Please enter a valid email address.');
    }
    if (!password || password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      errs.password = t('setup_s1_err_password', 'Password must be at least 8 characters with letters and numbers.');
    }
    if (password !== confirm) {
      errs.confirm = t('setup_s1_err_mismatch', 'Passwords do not match.');
    }
    if (Object.keys(errs).length > 0) { setS1Errors(errs); return; }
    setS1Errors({});
    setStep(2);
  }, [adminEmail, password, confirm, t]);

  // ── Step 2 ────────────────────────────────────────────────────────────────
  const [allLangs,       setAllLangs]       = useState<Language[]>([]);
  const [langsLoading,   setLangsLoading]   = useState(false);
  const [selectedId,     setSelectedId]     = useState<number | null>(null);
  const [selectedCode,   setSelectedCode]   = useState<string>('en');
  const [selectedNative, setSelectedNative] = useState<string>('English');

  useEffect(() => {
    if (step !== 2) return;
    setLangsLoading(true);
    languageApi.getAll()
      .then(res => setAllLangs(res.data.data || []))
      .catch(() => {})
      .finally(() => setLangsLoading(false));
  }, [step]);

  const activeLangs  = allLangs.filter(l => l.isActive);
  const nonEnLangs   = activeLangs.filter(l => l.code !== 'en');
  const onlyEnActive = nonEnLangs.length === 0;

  const handleLangSelect = useCallback((lang: Language | null) => {
    if (!lang) { setSelectedId(null); setSelectedCode('en'); setSelectedNative('English'); }
    else        { setSelectedId(lang.id); setSelectedCode(lang.code); setSelectedNative(lang.nameNative || lang.name); }
  }, []);

  // ── Step 3 ────────────────────────────────────────────────────────────────
  const [kimiKey,     setKimiKey]     = useState('');
  const [showKimiKey, setShowKimiKey] = useState(false);
  const [kimiTesting, setKimiTesting] = useState(false);
  const [kimiStatus,  setKimiStatus]  = useState<'idle' | 'verified' | 'failed'>('idle');
  const needsKimi = selectedId !== null;

  const handleKimiTest = useCallback(async () => {
    if (!kimiKey.trim() || kimiTesting) return;
    setKimiTesting(true); setKimiStatus('idle');
    try {
      await configApi.save({ integrations: { kimiApiKey: kimiKey.trim() } });
      await kimiApi.chat({ model: 'moonshot-v1-8k', max_tokens: 10, messages: [{ role: 'user', content: 'hi' }] });
      setKimiStatus('verified');
    } catch { setKimiStatus('failed'); }
    setKimiTesting(false);
  }, [kimiKey, kimiTesting]);

  const handleS3Continue = useCallback(() => {
    if (needsKimi && !kimiKey.trim()) {
      if (!window.confirm(t('setup_s3_warn_untested', 'Key not verified. Continue anyway?'))) return;
    }
    setStep(4);
  }, [needsKimi, kimiKey, t]);

  // ── Step 4 ────────────────────────────────────────────────────────────────
  const [tasks,     setTasks]     = useState<SetupTask[]>([]);
  const [allDone,   setAllDone]   = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  const updateTask = useCallback((id: string, patch: Partial<SetupTask>) => {
    setTasks(prev => prev.map(tk => tk.id === id ? { ...tk, ...patch } : tk));
  }, []);

  const runSetup = useCallback(async () => {
    const taskList: SetupTask[] = [
      { id: 'creds', label: t('setup_s4_credentials', 'Saving admin credentials\u2026'),  status: 'pending' },
      { id: 'kimi',  label: t('setup_s4_kimi',        'Saving Kimi API key\u2026'),        status: kimiKey.trim() ? 'pending' : 'skipped' },
      { id: 'lang',  label: t('setup_s4_language',    'Setting default language\u2026'),   status: selectedId !== null ? 'pending' : 'skipped' },
      { id: 'seed',  label: t('setup_s4_strings',     'Seeding UI strings\u2026'),         status: 'pending' },
    ];
    setTasks(taskList); setAllDone(false); setHasFailed(false);

    const fail = (id: string, msg: string) => { updateTask(id, { status: 'error', error: msg }); setHasFailed(true); };

    // 1. Credentials — email used as both username and email
    updateTask('creds', { status: 'running' });
    try {
      await adminApi.reseed({ username: adminEmail.trim() || undefined, password: password || undefined, email: adminEmail.trim() || undefined });
      updateTask('creds', { status: 'done' });
    } catch (e: any) { fail('creds', e?.response?.data?.message || e?.message || 'Failed'); return; }

    // 2. Kimi key
    if (kimiKey.trim()) {
      updateTask('kimi', { status: 'running' });
      try { await configApi.save({ integrations: { kimiApiKey: kimiKey.trim() } }); updateTask('kimi', { status: 'done' }); }
      catch (e: any) { fail('kimi', e?.response?.data?.message || e?.message || 'Failed'); return; }
    }

    // 3. Default language
    if (selectedId !== null) {
      updateTask('lang', { status: 'running' });
      try { await languageApi.setDefault(selectedId); updateTask('lang', { status: 'done' }); }
      catch (e: any) { fail('lang', e?.response?.data?.message || e?.message || 'Failed'); return; }
    }

    // 4. Reload
    updateTask('seed', { status: 'running' });
    try { await loadLanguages(); await loadUiStrings(); await loadConfig(); updateTask('seed', { status: 'done' }); }
    catch (e: any) { fail('seed', e?.response?.data?.message || e?.message || 'Failed'); return; }

    setAllDone(true);
  }, [adminEmail, password, kimiKey, selectedId, t, updateTask, loadLanguages, loadUiStrings, loadConfig]);

  useEffect(() => {
    if (step === 4 && tasks.length === 0) runSetup();
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoToDashboard = useCallback(() => { onComplete(); navigate('/'); }, [onComplete, navigate]);

  const handleStartOver = useCallback(() => {
    setStep(1); setTasks([]); setAllDone(false); setHasFailed(false);
    setAdminEmail(''); setPassword(''); setConfirm(''); setS1Errors({});
    setSelectedId(null); setSelectedCode('en'); setSelectedNative('English');
    setKimiKey(''); setKimiStatus('idle');
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-base)', zIndex: 500, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 24px 60px' }}>

      {/* Mesh grid */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', backgroundImage: `linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)`, backgroundSize: '40px 40px', opacity: 0.4, maskImage: 'radial-gradient(ellipse 80% 80% at 50% 30%, black 20%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 30%, black 20%, transparent 100%)' }} />

      <div style={{ position: 'relative', width: '100%', maxWidth: 580 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Icons.cube size={24} color="white" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
            {t('setup_welcome_title', 'Welcome to the HUB')}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {t('setup_welcome_subtitle', 'Your product development portal')}
          </p>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '32px 36px', boxShadow: 'var(--shadow-lg)' }}>
          <Stepper current={step} t={t} />

          {/* ── STEP 1 ─────────────────────────────────────────────────── */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{t('setup_s1_title', 'Set Admin Credentials')}</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 22, lineHeight: 1.6 }}>{t('setup_s1_desc', 'Replace the default admin credentials with your own.')}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>

                {/* Admin Email (serves as login username) */}
                <div>
                  <label style={labelSt}>{t('setup_s1_email', 'Admin Email')}</label>
                  <input type="email" value={adminEmail} autoFocus
                    onChange={e => { setAdminEmail(e.target.value); setS1Errors(p => ({ ...p, username: undefined })); }}
                    placeholder={t('setup_s1_email_ph', 'admin@yourcompany.com')}
                    style={{ ...inputSt, borderColor: s1Errors.username ? 'var(--red)' : 'var(--border)' }} />
                  {s1Errors.username && <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>{s1Errors.username}</p>}
                </div>

                {/* Password */}
                <div>
                  <label style={labelSt}>{t('setup_s1_password', 'Password')}</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPass ? 'text' : 'password'} value={password}
                      onChange={e => { setPassword(e.target.value); setS1Errors(p => ({ ...p, password: undefined })); }}
                      placeholder={t('setup_s1_password_ph', 'Min. 8 characters with letters and numbers')}
                      style={{ ...inputSt, paddingRight: 40, borderColor: s1Errors.password ? 'var(--red)' : 'var(--border)' }} />
                    <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                      {showPass ? <Icons.eyeOff size={15} /> : <Icons.eye size={15} />}
                    </button>
                  </div>
                  {s1Errors.password && <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>{s1Errors.password}</p>}
                </div>

                {/* Confirm */}
                <div>
                  <label style={labelSt}>{t('setup_s1_confirm', 'Confirm Password')}</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showConf ? 'text' : 'password'} value={confirm}
                      onChange={e => { setConfirm(e.target.value); setS1Errors(p => ({ ...p, confirm: undefined })); }}
                      placeholder={t('setup_s1_confirm_ph', 'Repeat password')}
                      style={{ ...inputSt, paddingRight: 40, borderColor: s1Errors.confirm ? 'var(--red)' : 'var(--border)' }} />
                    <button type="button" onClick={() => setShowConf(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                      {showConf ? <Icons.eyeOff size={15} /> : <Icons.eye size={15} />}
                    </button>
                  </div>
                  {s1Errors.confirm && <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>{s1Errors.confirm}</p>}
                </div>
              </div>

              <div style={{ padding: '10px 14px', marginBottom: 22, background: 'rgba(248,81,73,0.06)', border: '1px solid rgba(248,81,73,0.2)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {t('setup_s1_warning', 'Store your password safely \u2014 it cannot be recovered without database access.')}
              </div>

              <button onClick={handleS1Continue} style={primaryBtn(false)}>{t('btn_next', 'Continue')}</button>
            </div>
          )}

          {/* ── STEP 2 ─────────────────────────────────────────────────── */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{t('setup_s2_title', 'Choose Default Language')}</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 22, lineHeight: 1.6 }}>{t('setup_s2_desc', 'The primary language for this deployment.')}</p>

              {langsLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>
                  <span style={spinnerSt} /> {t('lt_loading', 'Loading\u2026')}
                </div>
              ) : onlyEnActive ? (
                <div>
                  <div style={{ padding: '12px 16px', marginBottom: 20, background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {t('setup_s2_no_langs', 'No additional languages have been added yet. You can add languages in Admin Setup after completing this setup.')}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setStep(3)} style={primaryBtn(false)}>{t('setup_s2_keep_en', 'Keep English as default')}</button>
                    <button onClick={() => setStep(1)} style={ghostBtn}>{t('btn_prev', 'Back')}</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: `1px solid ${selectedId === null ? 'var(--accent)' : 'var(--border)'}`, background: selectedId === null ? 'rgba(99,102,241,0.06)' : 'var(--bg-overlay)', transition: 'all 0.15s' }}>
                      <input type="radio" name="lang" checked={selectedId === null} onChange={() => handleLangSelect(null)} style={{ accentColor: 'var(--accent)', width: 15, height: 15, flexShrink: 0, cursor: 'pointer' }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>English</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>EN {'\u2014'} {t('setup_s2_keep_en', 'Keep English as default')}</div>
                      </div>
                    </label>
                    {nonEnLangs.map(lang => (
                      <label key={lang.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: `1px solid ${selectedId === lang.id ? 'var(--accent)' : 'var(--border)'}`, background: selectedId === lang.id ? 'rgba(99,102,241,0.06)' : 'var(--bg-overlay)', transition: 'all 0.15s' }}>
                        <input type="radio" name="lang" checked={selectedId === lang.id} onChange={() => handleLangSelect(lang)} style={{ accentColor: 'var(--accent)', width: 15, height: 15, flexShrink: 0, cursor: 'pointer' }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            {lang.nameNative}
                            {lang.isRtl && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontWeight: 700 }}>RTL</span>}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{lang.name} {'\u00b7'} {lang.code.toUpperCase()}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                  {selectedId !== null && (
                    <div style={{ padding: '10px 14px', marginBottom: 18, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {t('setup_s2_hint', 'After setup completes, go to Admin Setup > Language & Translation to translate UI strings.')}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setStep(3)} style={primaryBtn(false)}>{t('btn_next', 'Continue')}</button>
                    <button onClick={() => setStep(1)} style={ghostBtn}>{t('btn_prev', 'Back')}</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3 ─────────────────────────────────────────────────── */}
          {step === 3 && (
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                {needsKimi ? t('setup_s3_title_required', 'AI Translation Key (Required)') : t('setup_s3_title_optional', 'AI Translation Key (Optional)')}
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 22, lineHeight: 1.6 }}>
                {needsKimi ? t('setup_s3_desc_required', 'A Kimi API key is required to translate the interface to {lang}.').replace('{lang}', selectedNative) : t('setup_s3_desc_optional', 'Add a Kimi API key now or later in Admin Setup > Integrations.')}
              </p>
              <div style={{ marginBottom: 16 }}>
                <label style={labelSt}>{t('setup_s3_key_label', 'Kimi API Key')}</label>
                <div style={{ position: 'relative' }}>
                  <input type={showKimiKey ? 'text' : 'password'} value={kimiKey} onChange={e => { setKimiKey(e.target.value); setKimiStatus('idle'); }} placeholder={t('setup_s3_key_ph', 'sk-...')} style={{ ...inputSt, paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowKimiKey(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                    {showKimiKey ? <Icons.eyeOff size={15} /> : <Icons.eye size={15} />}
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
                <button onClick={handleKimiTest} disabled={!kimiKey.trim() || kimiTesting} style={{ padding: '7px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--blue)', background: 'none', color: 'var(--blue)', fontSize: 12, fontWeight: 600, cursor: !kimiKey.trim() || kimiTesting ? 'not-allowed' : 'pointer', opacity: !kimiKey.trim() || kimiTesting ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {kimiTesting && <span style={spinnerSt} />}
                  {kimiTesting ? t('setup_s3_testing', 'Testing\u2026') : t('setup_s3_test_btn', 'Test Connection')}
                </button>
                {kimiStatus === 'verified' && <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>{'\u2713'} {t('setup_s3_verified', 'Connection verified')}</span>}
                {kimiStatus === 'failed'   && <span style={{ fontSize: 12, color: 'var(--red)',    fontWeight: 600 }}>{t('setup_s3_failed', 'Connection failed')}</span>}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleS3Continue} style={primaryBtn(false)}>{t('btn_next', 'Continue')}</button>
                {!needsKimi && <button onClick={() => setStep(4)} style={ghostBtn}>{t('setup_s3_skip', 'Skip for now')}</button>}
                <button onClick={() => setStep(2)} style={ghostBtn}>{t('btn_prev', 'Back')}</button>
              </div>
            </div>
          )}

          {/* ── STEP 4 ─────────────────────────────────────────────────── */}
          {step === 4 && (
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{t('setup_s4_title', 'Applying Setup')}</h2>
              {tasks.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '20px 0' }}>
                  {tasks.map(task => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: task.status === 'error' ? 'rgba(248,81,73,0.05)' : task.status === 'done' ? 'rgba(5,150,105,0.05)' : 'var(--bg-overlay)', border: `1px solid ${task.status === 'error' ? 'rgba(248,81,73,0.25)' : task.status === 'done' ? 'rgba(5,150,105,0.25)' : 'var(--border)'}` }}>
                      <TaskIcon status={task.status} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: task.status === 'skipped' ? 'var(--text-muted)' : 'var(--text-primary)', opacity: task.status === 'pending' ? 0.5 : 1 }}>{task.label}</div>
                        {task.error && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 2 }}>{task.error}</div>}
                      </div>
                      {task.status === 'skipped' && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Skipped</span>}
                    </div>
                  ))}
                </div>
              )}
              {allDone && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '14px 18px', background: 'rgba(5,150,105,0.07)', border: '1px solid rgba(5,150,105,0.3)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: 22, color: '#059669' }}>{'\u2713'}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>{t('setup_s4_done_title', 'Setup complete. The Hub is ready.')}</span>
                  </div>
                  <button onClick={handleGoToDashboard} style={primaryBtn(false)}>{t('setup_s4_go', 'Go to Dashboard')}</button>
                </div>
              )}
              {hasFailed && !allDone && (
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button onClick={() => { setTasks([]); runSetup(); }} style={primaryBtn(false)}>{t('setup_s4_retry', 'Retry')}</button>
                  <button onClick={handleStartOver} style={ghostBtn}>{t('setup_s4_start_over', 'Start Over')}</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
