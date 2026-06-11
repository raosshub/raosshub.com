import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation }  from 'react-router-dom';
import { useI18nStore }              from '@/stores/useI18nStore';
import { useNotificationStore }      from '@/stores/useNotificationStore';
import { configApi, teamApi, languageApi, i18nApi, adminApi, kimiApi } from '@/utils/api';
import { Icons }                     from '@/components/icons';

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

interface LocationState {
  langId: number; langCode: string; langName: string; langNative: string;
}

const LS_KEY = 'hub_lang_wizard';
const LS_TTL = 30 * 60 * 1000;

function saveWizardState(step: number, langId: number, langCode: string) {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ step, langId, langCode, ts: Date.now() })); } catch {}
}
function clearWizardState() { try { localStorage.removeItem(LS_KEY); } catch {} }
function loadWizardState(): { step: number; langId: number; langCode: string } | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (Date.now() - p.ts > LS_TTL) { localStorage.removeItem(LS_KEY); return null; }
    return p;
  } catch { return null; }
}

function Stepper({ current, t }: { current: WizardStep; t: (k: string, f?: string) => string }) {
  const steps = [
    { n: 1 as const, key: 'change_lang_s1_label', fb: 'Admin Account'  },
    { n: 2 as const, key: 'change_lang_s2_label', fb: 'Kimi Key'       },
    { n: 3 as const, key: 'change_lang_s3_label', fb: 'Factory Reset'  },
    { n: 4 as const, key: 'change_lang_s4_label', fb: 'Reseed Strings' },
    { n: 5 as const, key: 'change_lang_s5_label', fb: 'Verify'         },
    { n: 6 as const, key: 'change_lang_s6_label', fb: 'Set Default'    },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 32 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 60 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, transition: 'all 0.3s', background: s.n < current ? '#059669' : s.n === current ? 'var(--accent)' : 'var(--bg-overlay)', color: s.n <= current ? 'white' : 'var(--text-muted)', border: s.n > current ? '1px solid var(--border)' : 'none' }}>
              {s.n < current ? '\u2713' : s.n}
            </div>
            <span style={{ fontSize: 9, fontWeight: s.n === current ? 700 : 400, textAlign: 'center', color: s.n < current ? '#059669' : s.n === current ? 'var(--text-primary)' : 'var(--text-muted)', lineHeight: 1.3, maxWidth: 56 }}>
              {t(s.key, s.fb)}
            </span>
          </div>
          {i < steps.length - 1 && <div style={{ flex: 1, height: 2, marginTop: 15, transition: 'background 0.3s', background: current > s.n ? '#059669' : 'var(--border)' }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

const cardSt: React.CSSProperties = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px 28px', marginBottom: 16 };
const dangerCardSt: React.CSSProperties = { ...cardSt, border: '1px solid rgba(248,81,73,0.4)', background: 'rgba(248,81,73,0.04)' };
const inputSt: React.CSSProperties = { width: '100%', padding: '8px 11px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const labelSt: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 5, display: 'block' };
const primaryBtn = (disabled: boolean): React.CSSProperties => ({ padding: '10px 24px', borderRadius: 'var(--radius-sm)', border: 'none', background: disabled ? 'var(--bg-overlay)' : 'var(--accent)', color: disabled ? 'var(--text-muted)' : 'var(--text-inverse)', fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 });
const ghostBtn: React.CSSProperties = { padding: '10px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'none', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer' };
const spinnerSt: React.CSSProperties = { width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', display: 'inline-block', flexShrink: 0 };
const infoBoxSt: React.CSSProperties = { padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 };

export default function ChangeDefaultLanguagePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, defaultLang, loadLanguages } = useI18nStore();
  const { addToast } = useNotificationStore();

  const ls = location.state as LocationState | null;

  useEffect(() => { if (!ls?.langId) navigate('/admin/setup'); }, [ls, navigate]);

  const [step, setStep] = useState<WizardStep>(1);

  // Recovery banner
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [resumeStep,       setResumeStep]       = useState(1);

  useEffect(() => {
    const saved = loadWizardState();
    if (saved && saved.langId === ls?.langId && saved.step > 1) { setResumeStep(saved.step); setShowResumeBanner(true); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step 1 — Admin Credentials ────────────────────────────────────────────
  // s1Email serves as BOTH the login username AND the email address,
  // matching the main site where username = email (required for forgot password).
  const [keepCreds,  setKeepCreds]  = useState(true);
  const [s1Email,    setS1Email]    = useState('');
  const [s1Password, setS1Password] = useState('');
  const [s1Confirm,  setS1Confirm]  = useState('');
  const [showS1Pass, setShowS1Pass] = useState(false);
  const [showS1Conf, setShowS1Conf] = useState(false);
  const [s1Errors,   setS1Errors]   = useState<{ username?: string; password?: string; confirm?: string }>({});

  const handleS1Continue = useCallback(() => {
    if (keepCreds) { setStep(2); saveWizardState(2, ls!.langId, ls!.langCode); return; }
    const errs: typeof s1Errors = {};
    if (!s1Email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s1Email.trim())) {
      errs.username = t('setup_s1_err_email', 'Please enter a valid email address.');
    }
    if (!s1Password || s1Password.length < 8 || !/[a-zA-Z]/.test(s1Password) || !/[0-9]/.test(s1Password)) {
      errs.password = t('setup_s1_err_password', 'Password must be at least 8 characters with letters and numbers.');
    }
    if (s1Password !== s1Confirm) { errs.confirm = t('setup_s1_err_mismatch', 'Passwords do not match.'); }
    if (Object.keys(errs).length > 0) { setS1Errors(errs); return; }
    setS1Errors({}); setStep(2); saveWizardState(2, ls!.langId, ls!.langCode);
  }, [keepCreds, s1Email, s1Password, s1Confirm, ls, t]);

  // ── Step 2 — Kimi Key ─────────────────────────────────────────────────────
  const [kimiKey,     setKimiKey]     = useState('');
  const [showKimiKey, setShowKimiKey] = useState(false);
  const [kimiTesting, setKimiTesting] = useState(false);
  const [kimiStatus,  setKimiStatus]  = useState<'idle' | 'verified' | 'failed'>('idle');

  useEffect(() => {
    if (step !== 2) return;
    configApi.get().then(res => { const k = res.data?.data?.integrations?.kimiApiKey; if (k && !kimiKey) setKimiKey(k); }).catch(() => {});
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKimiTest = useCallback(async () => {
    if (!kimiKey.trim() || kimiTesting) return;
    setKimiTesting(true); setKimiStatus('idle');
    try { await configApi.save({ integrations: { kimiApiKey: kimiKey.trim() } }); await kimiApi.chat({ model: 'moonshot-v1-8k', max_tokens: 10, messages: [{ role: 'user', content: 'hi' }] }); setKimiStatus('verified'); }
    catch { setKimiStatus('failed'); }
    setKimiTesting(false);
  }, [kimiKey, kimiTesting]);

  // ── Step 3 — Factory Reset ────────────────────────────────────────────────
  const [teamCount,    setTeamCount]    = useState<number | null>(null);
  const [sectionCount, setSectionCount] = useState<number | null>(null);
  const [s3Input,      setS3Input]      = useState('');
  const [s3Running,    setS3Running]    = useState(false);

  useEffect(() => {
    if (step !== 3) return;
    (async () => {
      try {
        const [teams, sections] = await Promise.all([teamApi.getAll(), i18nApi.getSections(defaultLang)]);
        setTeamCount((teams.data?.data || []).length); setSectionCount((sections.data?.data || []).length);
      } catch {}
    })();
  }, [step, defaultLang]);

  const handleFactoryReset = useCallback(async () => {
    if (s3Input !== 'FACTORY RESET' || s3Running) return;
    setS3Running(true);
    try { await configApi.factoryReset(); setStep(4); saveWizardState(4, ls!.langId, ls!.langCode); }
    catch (e: any) { addToast(t('int_save_fail', 'Save failed') + ': ' + (e?.response?.data?.message || e?.message || ''), 'error'); setS3Running(false); }
  }, [s3Input, s3Running, ls, addToast, t]);

  // ── Step 4 — Reseed ───────────────────────────────────────────────────────
  const [s4Running, setS4Running] = useState(false);
  const [s4Done,    setS4Done]    = useState(false);
  const [s4Error,   setS4Error]   = useState('');

  const handleReseed = useCallback(async () => {
    if (s4Running || s4Done) return;
    setS4Running(true); setS4Error('');
    try {
      const creds = keepCreds ? {} : { username: s1Email.trim() || undefined, password: s1Password || undefined, email: s1Email.trim() || undefined };
      await adminApi.reseed(creds);
      setS4Done(true); saveWizardState(5, ls!.langId, ls!.langCode);
    } catch (e: any) { setS4Error(e?.response?.data?.message || e?.message || 'Reseed failed'); }
    setS4Running(false);
  }, [s4Running, s4Done, keepCreds, s1Email, s1Password, ls]);

  const handleS4Back = useCallback(() => {
    if (window.confirm(t('change_lang_s4_back_warn', 'Factory reset has already run. Going back will not undo it.'))) setStep(3);
  }, [t]);

  // ── Step 5 — Verify ───────────────────────────────────────────────────────
  const [s5Checking, setS5Checking] = useState(false);
  const [s5TeamsOk,  setS5TeamsOk]  = useState(false);
  const [s5ConfigOk, setS5ConfigOk] = useState(false);
  const [s5Done,     setS5Done]     = useState(false);
  const [s5Err,      setS5Err]      = useState('');

  const runVerify = useCallback(async () => {
    setS5Checking(true); setS5Done(false); setS5Err('');
    try {
      const [teams, config] = await Promise.all([teamApi.getAll(), configApi.get()]);
      setS5TeamsOk((teams.data?.data || []).length === 0);
      setS5ConfigOk(Object.keys(config.data?.data || {}).length === 0);
      setS5Done(true);
    } catch (e: any) { setS5Err(e?.message || 'Verification failed'); }
    setS5Checking(false);
  }, []);

  useEffect(() => { if (step === 5) runVerify(); }, [step, runVerify]);

  // ── Step 6 — Set Default ──────────────────────────────────────────────────
  const [s6Running, setS6Running] = useState(false);
  const [s6Done,    setS6Done]    = useState(false);

  const handleSetDefault = useCallback(async () => {
    if (s6Running || !ls) return;
    setS6Running(true);
    try {
      await languageApi.setDefault(ls.langId);
      if (kimiKey.trim()) await configApi.save({ integrations: { kimiApiKey: kimiKey.trim() } });
      await loadLanguages(); clearWizardState(); setS6Done(true);
      addToast(t('change_lang_s6_done', 'Default language updated'), 'success');
    } catch (e: any) { addToast(t('lt_error', 'Error') + ': ' + (e?.message || ''), 'error'); setS6Running(false); }
  }, [s6Running, ls, kimiKey, loadLanguages, addToast, t]);

  if (!ls?.langId) return null;
  const isLocked = s3Running || s4Running || s6Running;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 48 }}>

      {/* Recovery banner */}
      {showResumeBanner && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', marginBottom: 20, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
          <span style={{ color: 'var(--text-primary)' }}>{t('change_lang_resume_banner', 'A previous language setup was interrupted. Resume from Step {n}?').replace('{n}', String(resumeStep))}</span>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => { setStep(resumeStep as WizardStep); setShowResumeBanner(false); }} style={{ ...primaryBtn(false), padding: '6px 14px', fontSize: 12 }}>{t('change_lang_resume_btn', 'Resume')}</button>
            <button onClick={() => { clearWizardState(); setShowResumeBanner(false); }} style={{ ...ghostBtn, padding: '6px 14px', fontSize: 12 }}>{t('change_lang_resume_discard', 'Start over')}</button>
          </div>
        </div>
      )}

      {/* Back link */}
      <button onClick={() => navigate('/admin/setup')} disabled={isLocked} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, padding: '0 0 20px', cursor: isLocked ? 'not-allowed' : 'pointer', opacity: isLocked ? 0.4 : 1 }}>
        <Icons.arrowLeft size={14} /> {t('change_lang_cancel', 'Back to Language Settings')}
      </button>

      <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>{t('change_lang_page_title', 'Change Default Language')}</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 32, lineHeight: 1.6 }}>{t('change_lang_page_subtitle', 'Follow each step carefully. This process cannot be interrupted once started.')}</p>

      <Stepper current={step} t={t} />

      {/* ── STEP 1 ────────────────────────────────────────────────────── */}
      {step === 1 && (
        <div style={cardSt}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{t('change_lang_s1_title', 'Admin Credentials')}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>{t('change_lang_s1_desc', 'Optionally update the admin credentials for this deployment.')}</p>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', marginBottom: 20, userSelect: 'none' }}>
            <input type="checkbox" checked={keepCreds} onChange={e => { setKeepCreds(e.target.checked); setS1Errors({}); }} style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer' }} />
            {t('change_lang_s1_keep', 'Keep current credentials')}
          </label>

          {!keepCreds && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>

              {/* Admin Email (serves as login username) */}
              <div>
                <label style={labelSt}>{t('setup_s1_email', 'Admin Email')}</label>
                <input type="email" value={s1Email} onChange={e => { setS1Email(e.target.value); setS1Errors(p => ({ ...p, username: undefined })); }} placeholder={t('setup_s1_email_ph', 'admin@yourcompany.com')} style={{ ...inputSt, borderColor: s1Errors.username ? 'var(--red)' : 'var(--border)' }} />
                {s1Errors.username && <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>{s1Errors.username}</p>}
              </div>

              {/* Password */}
              <div>
                <label style={labelSt}>{t('setup_s1_password', 'Password')}</label>
                <div style={{ position: 'relative' }}>
                  <input type={showS1Pass ? 'text' : 'password'} value={s1Password} onChange={e => { setS1Password(e.target.value); setS1Errors(p => ({ ...p, password: undefined })); }} placeholder={t('setup_s1_password_ph', 'Min. 8 characters with letters and numbers')} style={{ ...inputSt, paddingRight: 40, borderColor: s1Errors.password ? 'var(--red)' : 'var(--border)' }} />
                  <button type="button" onClick={() => setShowS1Pass(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                    {showS1Pass ? <Icons.eyeOff size={15} /> : <Icons.eye size={15} />}
                  </button>
                </div>
                {s1Errors.password && <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>{s1Errors.password}</p>}
              </div>

              {/* Confirm */}
              <div>
                <label style={labelSt}>{t('setup_s1_confirm', 'Confirm Password')}</label>
                <div style={{ position: 'relative' }}>
                  <input type={showS1Conf ? 'text' : 'password'} value={s1Confirm} onChange={e => { setS1Confirm(e.target.value); setS1Errors(p => ({ ...p, confirm: undefined })); }} placeholder={t('setup_s1_confirm_ph', 'Repeat password')} style={{ ...inputSt, paddingRight: 40, borderColor: s1Errors.confirm ? 'var(--red)' : 'var(--border)' }} />
                  <button type="button" onClick={() => setShowS1Conf(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                    {showS1Conf ? <Icons.eyeOff size={15} /> : <Icons.eye size={15} />}
                  </button>
                </div>
                {s1Errors.confirm && <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>{s1Errors.confirm}</p>}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleS1Continue} style={primaryBtn(false)}>{t('btn_next', 'Continue')}</button>
            <button onClick={() => navigate('/admin/setup')} style={ghostBtn}>{t('btn_cancel', 'Cancel')}</button>
          </div>
        </div>
      )}

      {/* ── STEP 2 ────────────────────────────────────────────────────── */}
      {step === 2 && (
        <div style={cardSt}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{t('change_lang_s2_title', 'Kimi API Key')}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>{t('change_lang_s2_desc', 'Required to translate UI strings to the new default language.')}</p>
          <div style={{ marginBottom: 16 }}>
            <label style={labelSt}>{t('setup_s3_key_label', 'Kimi API Key')}</label>
            <div style={{ position: 'relative' }}>
              <input type={showKimiKey ? 'text' : 'password'} value={kimiKey} onChange={e => { setKimiKey(e.target.value); setKimiStatus('idle'); }} placeholder={t('setup_s3_key_ph', 'sk-...')} style={{ ...inputSt, paddingRight: 40 }} />
              <button type="button" onClick={() => setShowKimiKey(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                {showKimiKey ? <Icons.eyeOff size={15} /> : <Icons.eye size={15} />}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <button onClick={handleKimiTest} disabled={!kimiKey.trim() || kimiTesting} style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--blue)', background: 'none', color: 'var(--blue)', fontSize: 12, fontWeight: 600, cursor: !kimiKey.trim() || kimiTesting ? 'not-allowed' : 'pointer', opacity: !kimiKey.trim() || kimiTesting ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              {kimiTesting && <span style={spinnerSt} />}
              {kimiTesting ? t('setup_s3_testing', 'Testing\u2026') : t('setup_s3_test_btn', 'Test Connection')}
            </button>
            {kimiStatus === 'verified' && <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>{'\u2713'} {t('setup_s3_verified', 'Connection verified')}</span>}
            {kimiStatus === 'failed'   && <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>{t('setup_s3_failed', 'Connection failed')}</span>}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setStep(3); saveWizardState(3, ls!.langId, ls!.langCode); }} style={primaryBtn(false)}>{t('change_lang_s4_next', 'Continue')}</button>
            <button onClick={() => setStep(1)} style={ghostBtn}>{t('btn_prev', 'Back')}</button>
          </div>
        </div>
      )}

      {/* ── STEP 3 ────────────────────────────────────────────────────── */}
      {step === 3 && (
        <div style={dangerCardSt}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--red)', marginBottom: 10 }}>{t('change_lang_s3_title', 'Factory Reset')}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 18 }}>{t('change_lang_s3_desc', 'Permanently deletes all team content, files, locale content, and configuration. Superadmin users are preserved.')}</p>
          {(teamCount !== null || sectionCount !== null) && (
            <div style={{ padding: '12px 16px', marginBottom: 18, borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', border: '1px solid rgba(248,81,73,0.25)' }}>
              <div style={{ ...labelSt, color: 'var(--red)', marginBottom: 10 }}>{t('change_lang_s1_data_title', 'Will be deleted:')}</div>
              <div style={{ display: 'flex', gap: 24 }}>
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}><strong>{teamCount ?? '\u2014'}</strong>{' '}{t('change_lang_s3_data_teams', 'Teams')}</span>
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}><strong>{sectionCount ?? '\u2014'}</strong>{' '}{t('change_lang_s3_data_sections', 'Locale sections')}</span>
              </div>
            </div>
          )}
          <label style={{ ...labelSt, color: 'var(--red)' }}>{t('change_lang_s3_confirm_label', 'Type FACTORY RESET to confirm')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={s3Input} onChange={e => setS3Input(e.target.value)} placeholder="FACTORY RESET" disabled={s3Running} autoFocus style={{ ...inputSt, flex: 1, fontFamily: "'DM Mono', monospace", fontWeight: 600, letterSpacing: '0.5px', border: '1px solid rgba(248,81,73,0.5)' }} />
            <button onClick={handleFactoryReset} disabled={s3Input !== 'FACTORY RESET' || s3Running} style={{ padding: '8px 20px', borderRadius: 'var(--radius-sm)', border: 'none', background: s3Input === 'FACTORY RESET' && !s3Running ? 'var(--red)' : 'var(--bg-overlay)', color: s3Input === 'FACTORY RESET' && !s3Running ? 'white' : 'var(--text-muted)', fontSize: 13, fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap', cursor: s3Input === 'FACTORY RESET' && !s3Running ? 'pointer' : 'not-allowed' }}>
              {s3Running ? <><span style={spinnerSt} />{' '}{t('change_lang_s3_running', 'Resetting\u2026')}</> : t('change_lang_s3_btn', 'Execute Factory Reset')}
            </button>
          </div>
          {!s3Running && <button onClick={() => setStep(2)} style={{ ...ghostBtn, marginTop: 12 }}>{t('btn_prev', 'Back')}</button>}
        </div>
      )}

      {/* ── STEP 4 ────────────────────────────────────────────────────── */}
      {step === 4 && (
        <div style={cardSt}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{t('change_lang_s4_title', 'Reseed EN Strings')}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>{t('change_lang_s4_desc', 'Re-seeds all English UI strings. No backend restart required.')}</p>
          {!s4Done && !s4Error && (
            <button onClick={handleReseed} disabled={s4Running} style={{ ...primaryBtn(s4Running), display: 'flex', alignItems: 'center', gap: 8 }}>
              {s4Running && <span style={spinnerSt} />}
              {s4Running ? t('change_lang_s4_running', 'Reseeding\u2026') : t('change_lang_s4_btn', 'Reseed EN Strings')}
            </button>
          )}
          {s4Error && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>{s4Error}</p>
              <button onClick={() => setS4Error('')} style={primaryBtn(false)}>{t('setup_s4_retry', 'Retry')}</button>
            </div>
          )}
          {s4Done && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#059669', fontSize: 13, fontWeight: 600 }}>
                <span style={{ fontSize: 16 }}>{'\u2713'}</span>{t('change_lang_s4_done', 'EN strings reseeded successfully')}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setStep(5); }} style={primaryBtn(false)}>{t('change_lang_s4_next', 'Continue')}</button>
                <button onClick={handleS4Back} style={ghostBtn}>{t('btn_prev', 'Back')}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 5 ────────────────────────────────────────────────────── */}
      {step === 5 && (
        <div style={cardSt}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>{t('change_lang_s5_title', 'Verify Clean State')}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 18 }}>{t('change_lang_s5_desc', 'Confirming the system is clean before setting the new default language.')}</p>
          {s5Checking && <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 13, padding: '8px 0 20px' }}><span style={spinnerSt} />{t('change_lang_s5_checking', 'Checking system state\u2026')}</div>}
          {s5Err && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>{s5Err}</div>}
          {s5Done && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {([{ ok: s5TeamsOk, label: t('change_lang_s5_teams_ok', 'Teams') }, { ok: s5ConfigOk, label: t('change_lang_s5_config_ok', 'Configuration') }] as const).map(({ ok, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 'var(--radius-sm)', background: ok ? 'rgba(5,150,105,0.05)' : 'rgba(248,81,73,0.05)', border: `1px solid ${ok ? 'rgba(5,150,105,0.3)' : 'rgba(248,81,73,0.3)'}` }}>
                    <span style={{ fontSize: 15, color: ok ? '#059669' : 'var(--red)', fontWeight: 700 }}>{ok ? '\u2713' : '\u2717'}</span>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: ok ? '#059669' : 'var(--red)' }}>{ok ? t('lt_done', 'Clean') : t('lt_error', 'Not empty')}</span>
                  </div>
                ))}
              </div>
              {s5TeamsOk && s5ConfigOk ? (
                <button onClick={() => { setStep(6); saveWizardState(6, ls!.langId, ls!.langCode); }} style={primaryBtn(false)}>{t('change_lang_s5_next', 'Continue')}</button>
              ) : (
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 12 }}>{t('change_lang_s5_not_clean', 'System is not fully clean. Factory reset may not have completed.')}</p>
                  <button onClick={runVerify} style={primaryBtn(false)}>{t('change_lang_s5_retry', 'Retry Verification')}</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── STEP 6 ────────────────────────────────────────────────────── */}
      {step === 6 && (
        <div style={cardSt}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>{t('change_lang_s6_title', 'Set New Default Language')}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 22 }}>{t('tab_language_desc', 'Confirm the change. After this, author all content in the new default language.')}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', marginBottom: 28 }}>
            <div style={{ padding: '16px 18px', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ ...labelSt, marginBottom: 8 }}>{t('change_lang_s6_from', 'Current default')}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'line-through' }}>{defaultLang.toUpperCase()}</div>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: 18, flexShrink: 0 }}>{'\u2192'}</span>
            <div style={{ padding: '16px 18px', background: 'rgba(99,102,241,0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(99,102,241,0.4)' }}>
              <div style={{ ...labelSt, color: 'var(--accent)', marginBottom: 8 }}>{t('change_lang_s6_to', 'New default')}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{ls.langNative} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 13 }}>({ls.langCode.toUpperCase()})</span></div>
            </div>
          </div>
          {!s6Done ? (
            <button onClick={handleSetDefault} disabled={s6Running} style={{ ...primaryBtn(s6Running), display: 'flex', alignItems: 'center', gap: 8 }}>
              {s6Running && <span style={spinnerSt} />}
              {s6Running ? t('lt_translating_item', 'Working\u2026') : `${t('change_lang_s6_btn', 'Confirm \u2014 Set as Default')} (${ls.langNative})`}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#059669', fontSize: 14, fontWeight: 700 }}><span style={{ fontSize: 18 }}>{'\u2713'}</span>{t('change_lang_s6_done', 'Default language updated')}</div>
              <div style={infoBoxSt}>{t('change_lang_s6_next_steps', 'Next steps: go to Admin Setup > Language & Translation and click Translate All.')}</div>
              <button onClick={() => navigate('/admin/setup')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent)', background: 'none', color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: 'fit-content' }}>
                <Icons.arrowLeft size={14} />{t('change_lang_s6_return', 'Return to Language Settings')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
