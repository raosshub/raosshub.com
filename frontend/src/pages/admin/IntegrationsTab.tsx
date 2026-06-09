import React, { useState, useEffect, useCallback, useImperativeHandle } from 'react';
import { useI18nStore }         from '@/stores/useI18nStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { configApi, kimiApi }   from '@/utils/api';
import { Icons }                from '@/components/icons';
import type { TabContext }       from './AdminSetupPage';
import type { Language }        from '@/types';

export interface IntegrationsTabHandle {
  save: () => void; reset: () => void;
  hasChanges: boolean; saving: boolean;
}

interface SmtpConfig {
  host: string; port: number; username: string;
  password: string; fromAddress: string; tls: boolean;
}
interface IntegrationsForm {
  kimiApiKey: string;
  smtp: SmtpConfig;
}
const defaultForm: IntegrationsForm = {
  kimiApiKey: '',
  smtp: { host: '', port: 587, username: '', password: '', fromAddress: '', tls: true },
};

const cardSt:   React.CSSProperties = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 20px', marginBottom: 14 };
const dangerSt: React.CSSProperties = { ...cardSt, border: '1px solid rgba(248,81,73,0.4)', background: 'rgba(248,81,73,0.04)' };
const labelSt:  React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 5, display: 'block' };
const inputSt:  React.CSSProperties = { width: '100%', padding: '8px 11px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' };

function SectionHeading({ color, label }: { color: string; label: string }) {
  return (
    <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
      <span style={{ width: 3, height: 14, background: color, borderRadius: 2, flexShrink: 0 }} />
      {label}
    </h3>
  );
}

interface Props {
  onStateChange?:       (hasChanges: boolean, saving: boolean) => void;
  tabContext?:          TabContext | null;
  onReturnToLanguages?: (ctx: TabContext) => void;
}

const IntegrationsTab = React.forwardRef<IntegrationsTabHandle, Props>(
  ({ onStateChange, tabContext, onReturnToLanguages }, ref) => {

  const { t }        = useI18nStore();
  const { addToast } = useNotificationStore();

  const [form,           setForm]           = useState<IntegrationsForm>(defaultForm);
  const [original,       setOriginal]       = useState<IntegrationsForm>(defaultForm);
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [hasChanges,     setHasChanges]     = useState(false);
  const [showKimiKey,    setShowKimiKey]    = useState(false);
  const [showSmtpPass,   setShowSmtpPass]   = useState(false);
  const [kimiTestState,  setKimiTestState]  = useState<'idle'|'testing'|'ok'|'fail'>('idle');
  const [smtpTestState,  setSmtpTestState]  = useState<'idle'|'testing'|'ok'|'fail'>('idle');
  const [smtpTestMsg,    setSmtpTestMsg]    = useState('');
  const [backendStatus,  setBackendStatus]  = useState<'checking'|'online'|'offline'>('checking');
  const [backendMs,      setBackendMs]      = useState<number|null>(null);
  const [resetInput,     setResetInput]     = useState('');
  const [resetting,      setResetting]      = useState(false);
  const [factoryStep,    setFactoryStep]    = useState<0|1|2>(0);
  const [factoryInput,   setFactoryInput]   = useState('');
  const [factoryRunning, setFactoryRunning] = useState(false);

  const fromLanguageTab = tabContext?.reason === 'kimi_required';
  const pendingLang     = tabContext?.pendingDefaultLang as Language | undefined;

  useEffect(() => { onStateChange?.(hasChanges, saving); }, [hasChanges, saving, onStateChange]);

  const loadFromDB = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await configApi.get();
      const intg = (res.data?.data?.integrations || {}) as Record<string, any>;
      const loaded: IntegrationsForm = {
        kimiApiKey: intg.kimiApiKey || '',
        smtp: {
          host:        intg.smtp?.host        || '',
          port:        intg.smtp?.port        || 587,
          username:    intg.smtp?.username    || '',
          password:    intg.smtp?.password    || '',
          fromAddress: intg.smtp?.fromAddress || '',
          tls:         intg.smtp?.tls !== false,
        },
      };
      setForm(loaded); setOriginal(loaded);
    } catch {
      addToast(t('int_load_fail', 'Failed to load integrations config'), 'error');
    }
    setLoading(false); setHasChanges(false);
  }, [addToast, t]);

  const checkBackend = useCallback(async () => {
    setBackendStatus('checking');
    const start = Date.now();
    try {
      const res = await fetch('/api/health', { signal: AbortSignal.timeout(5000) });
      if (res.ok) { setBackendMs(Date.now() - start); setBackendStatus('online'); }
      else { setBackendStatus('offline'); setBackendMs(null); }
    } catch { setBackendStatus('offline'); setBackendMs(null); }
  }, []);

  useEffect(() => { loadFromDB(); checkBackend(); }, [loadFromDB, checkBackend]);

  const update = <K extends keyof IntegrationsForm>(k: K, v: IntegrationsForm[K]) => {
    setForm(p => ({ ...p, [k]: v })); setHasChanges(true);
  };

  const updateSmtp = (k: keyof SmtpConfig, v: string | number | boolean) => {
    setForm(p => {
      const updated = { ...p.smtp, [k]: v };
      if (k === 'port' && Number(v) === 465) updated.tls = true;
      return { ...p, smtp: updated };
    });
    setHasChanges(true);
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await configApi.save({ integrations: form });
      setOriginal(form); setHasChanges(false);
      addToast(t('int_save_success', 'Integrations saved'), 'success');
      setKimiTestState('idle'); setSmtpTestState('idle');
    } catch (e: any) {
      addToast(t('int_save_fail', 'Save failed') + ': ' + e.message, 'error');
    }
    setSaving(false);
  }, [form, addToast, t]);

  const handleReset = useCallback(() => {
    if (!window.confirm(t('admin_discard_changes', 'Discard all unsaved changes?'))) return;
    setForm(original); setHasChanges(false);
  }, [original, t]);

  useImperativeHandle(ref, () => ({
    save: handleSave, reset: handleReset,
    get hasChanges() { return hasChanges; },
    get saving()     { return saving; },
  }), [handleSave, handleReset, hasChanges, saving]);

  const handleKimiTest = useCallback(async () => {
    setKimiTestState('testing');
    try {
      if (hasChanges) await handleSave();
      const res  = await kimiApi.chat({ model: 'moonshot-v1-8k', max_tokens: 5, messages: [{ role: 'user', content: 'Reply: OK' }] });
      const text = res.data?.choices?.[0]?.message?.content || '';
      setKimiTestState(text.trim() ? 'ok' : 'fail');
    } catch { setKimiTestState('fail'); }
  }, [hasChanges, handleSave]);

  const handleReturn = useCallback(() => {
    onReturnToLanguages?.({ kimiVerified: true, pendingDefaultLang: pendingLang });
  }, [onReturnToLanguages, pendingLang]);

  const handleSmtpTest = useCallback(async () => {
    setSmtpTestState('testing'); setSmtpTestMsg('');
    try {
      const res = await configApi.testSmtp();
      const d   = res.data?.data as { success: boolean; message: string };
      if (d?.success) { setSmtpTestState('ok');   setSmtpTestMsg(d.message || ''); }
      else            { setSmtpTestState('fail');  setSmtpTestMsg(d?.message || 'Connection failed'); }
    } catch (e: any) {
      setSmtpTestState('fail');
      setSmtpTestMsg(e?.response?.data?.message || e?.message || 'Error');
    }
  }, []);

  const handleResetData = useCallback(async () => {
    setResetting(true);
    try {
      await configApi.resetData();
      addToast(t('int_reset_btn', 'Reset Data') + ' — complete', 'success');
      setResetInput('');
    } catch (e: any) {
      addToast(t('int_save_fail', 'Save failed') + ': ' + (e.response?.data?.message || e.message), 'error');
    }
    setResetting(false);
  }, [addToast, t]);

  const handleFactoryReset = useCallback(async () => {
    setFactoryRunning(true);
    try {
      await configApi.factoryReset();
      addToast(t('int_factory_title', 'Factory Reset') + ' — ' + t('int_reloading', 'Reloading…'), 'success');
      setTimeout(() => window.location.reload(), 1800);
    } catch (e: any) {
      addToast(t('int_save_fail', 'Save failed') + ': ' + (e.response?.data?.message || e.message), 'error');
      setFactoryRunning(false); setFactoryStep(0); setFactoryInput('');
    }
  }, [addToast, t]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, fontSize: 13, color: 'var(--text-muted)' }}>
        {t('int_loading', 'Loading…')}
      </div>
    );
  }

  const tlsLabel = form.smtp.port === 465
    ? t('int_smtp_ssl_required', 'SSL (required for port 465)')
    : form.smtp.port === 587
      ? t('int_smtp_starttls_note', 'STARTTLS (recommended)')
      : `${t('int_smtp_tls', 'TLS / STARTTLS')} ${form.smtp.tls ? t('int_smtp_tls_enabled', '(enabled)') : t('int_smtp_tls_disabled', '(disabled)')}`;

  return (
    <div>

      {/* ── Backend Status ───────────────────────────────────────────────────── */}
      <div style={{ ...cardSt, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
            background: backendStatus === 'online' ? '#059669' : backendStatus === 'offline' ? 'var(--red)' : 'var(--orange)',
            boxShadow: backendStatus === 'online' ? '0 0 0 3px rgba(5,150,105,0.15)' : 'none',
          }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            {t('int_backend_status', 'Backend Status')}
          </span>
          <span style={{ fontSize: 12, color: backendStatus === 'online' ? '#059669' : backendStatus === 'offline' ? 'var(--red)' : 'var(--orange)' }}>
            {backendStatus === 'online'   && t('int_backend_online',   'Online')}
            {backendStatus === 'offline'  && t('int_backend_offline',  'Offline')}
            {backendStatus === 'checking' && t('int_backend_checking', 'Checking…')}
          </span>
          {backendStatus === 'online' && backendMs !== null && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{backendMs}{t('int_backend_ms', 'ms')}</span>
          )}
        </div>
        <button onClick={checkBackend} style={{ padding: '5px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'none', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>
          {t('int_backend_refresh', 'Refresh')}
        </button>
      </div>

      {/* ── Kimi banner (when navigated from Tab 2) ──────────────────────────── */}
      {fromLanguageTab && (
        <div style={{ padding: '14px 18px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 'var(--radius)', marginBottom: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Icons.info size={18} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
              {t('lt_kimi_required_title', 'Kimi API Key Required')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {t('lt_kimi_required_body', 'A Kimi API key is needed to translate UI strings before setting a new default language.')}
            </div>
          </div>
        </div>
      )}

      {/* ── Kimi AI ──────────────────────────────────────────────────────────── */}
      <div style={cardSt}>
        <SectionHeading color="var(--cyan)" label={t('int_kimi_title', 'Kimi AI Integration')} />
        <label style={labelSt}>{t('int_api_key', 'API Key')}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type={showKimiKey ? 'text' : 'password'}
              value={form.kimiApiKey}
              onChange={e => { update('kimiApiKey', e.target.value); setKimiTestState('idle'); }}
              placeholder="sk-…"
              autoComplete="off"
              style={{ ...inputSt, paddingRight: 40 }}
            />
            <button type="button" onClick={() => setShowKimiKey(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              {showKimiKey ? <Icons.eye size={15} /> : <Icons.eyeOff size={15} />}
            </button>
          </div>
          <button onClick={handleKimiTest} disabled={!form.kimiApiKey || kimiTestState === 'testing'}
            style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: `1px solid ${kimiTestState === 'ok' ? '#059669' : kimiTestState === 'fail' ? 'var(--red)' : 'var(--border)'}`, background: kimiTestState === 'ok' ? 'rgba(5,150,105,0.1)' : kimiTestState === 'fail' ? 'rgba(248,81,73,0.08)' : 'none', color: kimiTestState === 'ok' ? '#059669' : kimiTestState === 'fail' ? 'var(--red)' : 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: !form.kimiApiKey || kimiTestState === 'testing' ? 'not-allowed' : 'pointer', flexShrink: 0, whiteSpace: 'nowrap', opacity: !form.kimiApiKey ? 0.5 : 1 }}>
            {kimiTestState === 'testing' && t('int_testing',     'Testing…')}
            {kimiTestState === 'ok'      && ('✓ ' + t('int_connected',  'Connected'))}
            {kimiTestState === 'fail'    && ('✗ ' + t('int_conn_failed','Failed'))}
            {kimiTestState === 'idle'    && t('int_test_connection','Test Connection')}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: form.kimiApiKey ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {form.kimiApiKey ? t('int_api_key_set', 'API key set') : t('int_api_key_not_set', 'Not configured — enter key to enable AI translation')}
          </span>
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {t('int_kimi_desc', 'Get your key at platform.moonshot.cn. Takes effect immediately on save — no backend restart needed.')}
        </div>
        {fromLanguageTab && kimiTestState === 'ok' && (
          <button onClick={handleReturn} style={{ marginTop: 14, padding: '10px 20px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--accent)', color: 'var(--text-inverse)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icons.arrowLeft size={14} />
            {t('lt_return_language_tab', 'Return to Language Settings')}
          </button>
        )}
      </div>

      {/* ── SMTP ─────────────────────────────────────────────────────────────── */}
      <div style={cardSt}>
        <SectionHeading color="var(--blue)" label={t('int_smtp_title', 'Email SMTP')} />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelSt}>{t('int_smtp_host', 'Host')}</label>
            <input style={inputSt} value={form.smtp.host} onChange={e => updateSmtp('host', e.target.value)} placeholder="smtp.gmail.com" />
          </div>
          <div>
            <label style={labelSt}>{t('int_smtp_port', 'Port')}</label>
            <input style={inputSt} type="number" value={form.smtp.port} onChange={e => updateSmtp('port', Number(e.target.value))} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelSt}>{t('int_smtp_username', 'Username')}</label>
            <input style={inputSt} value={form.smtp.username} onChange={e => updateSmtp('username', e.target.value)} autoComplete="off" />
          </div>
          <div>
            <label style={labelSt}>{t('int_smtp_password', 'Password')}</label>
            <div style={{ position: 'relative' }}>
              <input type={showSmtpPass ? 'text' : 'password'} value={form.smtp.password} onChange={e => updateSmtp('password', e.target.value)} autoComplete="new-password" style={{ ...inputSt, paddingRight: 36 }} />
              <button type="button" onClick={() => setShowSmtpPass(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                {showSmtpPass ? <Icons.eye size={15} /> : <Icons.eyeOff size={15} />}
              </button>
            </div>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelSt}>{t('int_smtp_from', 'From Address')}</label>
          <input style={inputSt} value={form.smtp.fromAddress} onChange={e => updateSmtp('fromAddress', e.target.value)} placeholder="RAOSS Hub <noreply@example.com>" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: form.smtp.port === 465 ? 'not-allowed' : 'pointer', userSelect: 'none' }}>
            <div
              onClick={() => form.smtp.port !== 465 && updateSmtp('tls', !form.smtp.tls)}
              style={{ width: 36, height: 20, borderRadius: 10, background: form.smtp.tls ? 'var(--accent)' : 'var(--bg-overlay)', border: '1px solid var(--border)', position: 'relative', cursor: form.smtp.port === 465 ? 'not-allowed' : 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: 2, left: form.smtp.tls ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: form.smtp.tls ? 'white' : 'var(--text-muted)', transition: 'left 0.2s' }} />
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{tlsLabel}</span>
          </label>
          <button onClick={handleSmtpTest} disabled={!form.smtp.host || smtpTestState === 'testing'}
            style={{ padding: '7px 14px', borderRadius: 'var(--radius-sm)', border: `1px solid ${smtpTestState === 'ok' ? '#059669' : smtpTestState === 'fail' ? 'var(--red)' : 'var(--border)'}`, background: smtpTestState === 'ok' ? 'rgba(5,150,105,0.08)' : smtpTestState === 'fail' ? 'rgba(248,81,73,0.08)' : 'none', color: smtpTestState === 'ok' ? '#059669' : smtpTestState === 'fail' ? 'var(--red)' : 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: !form.smtp.host || smtpTestState === 'testing' ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: !form.smtp.host ? 0.5 : 1 }}>
            {smtpTestState === 'testing' && t('int_smtp_testing', 'Testing…')}
            {smtpTestState === 'ok'      && ('✓ ' + t('int_smtp_connected', 'SMTP Connected'))}
            {smtpTestState === 'fail'    && ('✗ ' + t('int_smtp_failed',    'Connection Failed'))}
            {smtpTestState === 'idle'    && t('int_smtp_test_btn', 'Test SMTP')}
          </button>
        </div>
        {smtpTestMsg && (
          <div style={{ marginTop: 8, fontSize: 11, color: smtpTestState === 'ok' ? '#059669' : 'var(--red)', fontFamily: "'DM Mono', monospace" }}>
            {smtpTestMsg}
          </div>
        )}
      </div>

      {/* ── Danger Zone ──────────────────────────────────────────────────────── */}
      <div style={dangerSt}>
        <SectionHeading color="var(--red)" label={t('int_danger_title', 'Danger Zone')} />

        {/* Reset Data */}
        <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(248,81,73,0.25)', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{t('int_reset_data_title', 'Reset Data')}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>{t('int_reset_data_desc', 'Clears all locale_content — all translated sections across all languages. Keeps users, teams, project config, and language definitions.')}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ ...labelSt, color: 'var(--red)' }}>{t('int_reset_confirm_label', 'Type RESET to confirm')}</label>
              <input value={resetInput} onChange={e => setResetInput(e.target.value)} placeholder="RESET" style={{ ...inputSt, border: '1px solid rgba(248,81,73,0.4)', fontFamily: "'DM Mono', monospace", fontWeight: 600 }} />
            </div>
            <button onClick={handleResetData} disabled={resetting || resetInput !== 'RESET'}
              style={{ padding: '8px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--red)', background: resetInput === 'RESET' ? 'var(--red)' : 'transparent', color: resetInput === 'RESET' ? 'white' : 'var(--red)', fontSize: 13, fontWeight: 600, cursor: resetInput === 'RESET' && !resetting ? 'pointer' : 'not-allowed', opacity: resetInput !== 'RESET' ? 0.5 : 1, flexShrink: 0, whiteSpace: 'nowrap' }}>
              {resetting ? t('int_resetting', 'Resetting…') : t('int_reset_btn', 'Reset Data')}
            </button>
          </div>
        </div>

        {/* Factory Reset */}
        <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(248,81,73,0.4)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', marginBottom: 4 }}>{t('int_factory_title', 'Factory Reset')}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>{t('int_factory_desc', 'Clears everything — locale content, project config, integrations, teams, files, non-superadmin users. Keeps only superadmin accounts. This CANNOT be undone.')}</div>
          {factoryStep === 0 && (
            <button onClick={() => setFactoryStep(1)} style={{ padding: '8px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--red)', background: 'transparent', color: 'var(--red)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {t('int_factory_proceed', 'I understand the risk, proceed')}
            </button>
          )}
          {factoryStep === 1 && (
            <div style={{ background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.4)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', marginBottom: 8 }}>{t('int_factory_confirm_heading', 'Confirm: This action CANNOT be undone')}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>{t('int_factory_confirm_desc', 'All team content, files, translations, and configuration will be permanently deleted.')}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setFactoryStep(2); setFactoryInput(''); }} style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--red)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t('int_factory_yes', 'Yes, I confirm')}</button>
                <button onClick={() => setFactoryStep(0)} style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'none', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>{t('int_factory_cancel', 'Cancel')}</button>
              </div>
            </div>
          )}
          {factoryStep === 2 && (
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ ...labelSt, color: 'var(--red)' }}>{t('int_factory_confirm_label', 'Type FACTORY RESET to confirm')}</label>
                  <input value={factoryInput} onChange={e => setFactoryInput(e.target.value)} placeholder="FACTORY RESET" autoFocus style={{ ...inputSt, border: '1px solid rgba(248,81,73,0.6)', fontFamily: "'DM Mono', monospace", fontWeight: 600, letterSpacing: '0.5px' }} />
                </div>
                <button onClick={handleFactoryReset} disabled={factoryRunning || factoryInput !== 'FACTORY RESET'}
                  style={{ padding: '8px 18px', borderRadius: 'var(--radius-sm)', border: 'none', background: factoryInput === 'FACTORY RESET' ? 'var(--red)' : 'var(--bg-overlay)', color: factoryInput === 'FACTORY RESET' ? 'white' : 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: factoryInput === 'FACTORY RESET' && !factoryRunning ? 'pointer' : 'not-allowed', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {factoryRunning ? t('int_factory_running', 'Running…') : t('int_factory_btn', 'Execute Factory Reset')}
                </button>
              </div>
              <button onClick={() => { setFactoryStep(0); setFactoryInput(''); }} style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {t('int_factory_cancel', 'Cancel')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

IntegrationsTab.displayName = 'IntegrationsTab';
export default IntegrationsTab;
