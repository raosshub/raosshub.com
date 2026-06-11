import React, { useState, useEffect, useCallback, useImperativeHandle, useRef } from 'react';
import { useI18nStore }         from '@/stores/useI18nStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useConfigStore }       from '@/stores/useConfigStore';
import { configApi, kimiApi }   from '@/utils/api';

export interface NotificationsTabHandle {
  save: () => void;
  reset: () => void;
  hasChanges: boolean;
  saving: boolean;
}

interface NotifForm {
  showVersion:  boolean;
  ndaTitle:     string;                       // admin-editable modal title
  ndaText:      string;                       // markdown body
  ndaShowMode:  'every_login' | 'once';       // show on every login or once per account
}

const defaultForm: NotifForm = {
  showVersion: true,
  ndaTitle:    '',
  ndaText:     '',
  ndaShowMode: 'every_login',
};

const DEFAULT_AGREEMENT_TEXT =
`# Site Agreement

## Confidential Access
This is a private product development portal. Access is restricted to authorised users only.

## Authorised Use
You agree to use this portal only for its intended purpose. Sharing credentials or content with unauthorised parties is prohibited.

## Data Protection
Your personal data is handled in accordance with applicable data protection regulations. We do not share your data with third parties.

## Intellectual Property
All content and materials on this portal are the intellectual property of the owning organisation. All rights reserved.`;

const cardSt:  React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: '18px 20px', marginBottom: 14,
};
const inputSt: React.CSSProperties = {
  width: '100%', padding: '8px 11px', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)', background: 'var(--bg-input)',
  color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
};
const labelSt: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
  letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 5, display: 'block',
};
const hintSt: React.CSSProperties = {
  fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5,
};

function SectionHeading({ color, label }: { color: string; label: string }) {
  return (
    <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14,
      display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
      <span style={{ width: 3, height: 14, background: color, borderRadius: 2, flexShrink: 0 }} />
      {label}
    </h3>
  );
}

function Toggle({ on, onChange, locked }: { on: boolean; onChange: () => void; locked?: boolean }) {
  return (
    <div onClick={locked ? undefined : onChange}
      style={{ width: 36, height: 20, borderRadius: 10, background: on ? 'var(--accent)' : 'var(--bg-overlay)',
        border: '1px solid var(--border)', position: 'relative', cursor: locked ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s', flexShrink: 0, opacity: locked ? 0.6 : 1 }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 14, height: 14,
        borderRadius: '50%', background: on ? 'white' : 'var(--text-muted)', transition: 'left 0.2s' }} />
    </div>
  );
}

// ─── Markdown renderer ────────────────────────────────────────────────────────
function esc(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function inlineFmt(t: string) {
  return esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>');
}
function renderMarkdown(md: string): string {
  if (!md?.trim()) return '';
  const lines = md.split('\n');
  let html = '', inList = false;
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('### ')) { if (inList) { html += '</ul>'; inList = false; }
      html += `<h3 style="font-size:14px;font-weight:700;color:var(--text-primary);margin:14px 0 6px">${inlineFmt(t.slice(4))}</h3>`; }
    else if (t.startsWith('## ')) { if (inList) { html += '</ul>'; inList = false; }
      html += `<h2 style="font-size:15px;font-weight:700;color:var(--text-primary);margin:16px 0 8px">${inlineFmt(t.slice(3))}</h2>`; }
    else if (t.startsWith('# ')) { if (inList) { html += '</ul>'; inList = false; }
      html += `<h1 style="font-size:17px;font-weight:700;color:var(--text-primary);margin:16px 0 8px">${inlineFmt(t.slice(2))}</h1>`; }
    else if (t.startsWith('- ') || t.startsWith('* ')) {
      if (!inList) { html += '<ul style="padding-left:20px;margin:8px 0">'; inList = true; }
      html += `<li style="margin-bottom:6px;line-height:1.6">${inlineFmt(t.slice(2))}</li>`; }
    else if (t === '') { if (inList) { html += '</ul>'; inList = false; } html += '<br>'; }
    else { if (inList) { html += '</ul>'; inList = false; }
      html += `<p style="margin:0 0 10px;line-height:1.7">${inlineFmt(t)}</p>`; }
  }
  if (inList) html += '</ul>';
  return html;
}

// ─── Component ────────────────────────────────────────────────────────────────
const NotificationsTab = React.forwardRef<
  NotificationsTabHandle,
  { onStateChange?: (hasChanges: boolean, saving: boolean) => void }
>(({ onStateChange }, ref) => {

  const { t, languages }  = useI18nStore();
  const { addToast }       = useNotificationStore();
  const { identity }       = useConfigStore();

  const [loading,           setLoading]           = useState(true);
  const [saving,            setSaving]            = useState(false);
  const [form,              setForm]              = useState<NotifForm>(defaultForm);
  const [original,          setOriginal]          = useState<NotifForm>(defaultForm);
  const [hasChanges,        setHasChanges]        = useState(false);
  const [translating,       setTranslating]       = useState(false);
  const [translationStatus, setTranslationStatus] = useState('');
  const [showPreview,       setShowPreview]       = useState(false);
  const ndaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (onStateChange) onStateChange(hasChanges, saving);
  }, [hasChanges, saving, onStateChange]);

  // ── Load ─────────────────────────────────────────────────────────────────────
  const loadFromDB = useCallback(async () => {
    setLoading(true);
    try {
      const res   = await configApi.get();
      const nda   = (res.data?.data?.nda           || {}) as Record<string, any>;
      const notif = (res.data?.data?.notifications || {}) as Record<string, any>;
      const loaded: NotifForm = {
        showVersion: notif.showVersion !== false,
        ndaTitle:    (nda.title    as string) || '',
        ndaText:     (nda.text_en  as string) || (nda.text as string) || '',
        ndaShowMode: ((nda.showMode as string) === 'once') ? 'once' : 'every_login',
      };
      setForm(loaded);
      setOriginal(loaded);
    } catch {
      addToast(t('tab6_save_fail', 'Save failed'), 'error');
    }
    setLoading(false);
    setHasChanges(false);
  }, [addToast, t]);

  useEffect(() => { loadFromDB(); }, [loadFromDB]);

  const update = (k: keyof NotifForm, v: NotifForm[keyof NotifForm]) => {
    setForm(p => ({ ...p, [k]: v }));
    setHasChanges(true);
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (loading) return;
    setSaving(true);
    try {
      const ndaPayload: Record<string, unknown> = {
        text_en:  form.ndaText,
        title:    form.ndaTitle,
        showMode: form.ndaShowMode,
      };

      // Auto-translate body text to every active non-EN language if Kimi configured
      const nonEnLangs = languages.filter(l => l.isActive && l.code !== 'en');

      if (nonEnLangs.length > 0 && form.ndaText.trim()) {
        const cfgRes  = await configApi.get();
        const kimiKey = (cfgRes.data?.data?.integrations?.kimiApiKey as string) || '';

        if (!kimiKey.trim()) {
          addToast(t('tab6_translate_no_kimi', 'Kimi API key not configured — agreement saved in EN only'), 'info');
        } else {
          setTranslating(true);
          const failedLangs: string[] = [];

          for (let i = 0; i < nonEnLangs.length; i++) {
            const lang = nonEnLangs[i];
            setTranslationStatus(
              t('tab6_translating', 'Translating to {lang}…').replace('{lang}', lang.nameNative || lang.name) +
              ` (${i + 1}/${nonEnLangs.length})`
            );
            try {
              const res = await kimiApi.chat({
                model:      'moonshot-v1-32k',
                max_tokens: 4000,
                messages:   [{
                  role:    'user',
                  content: `Translate the following markdown agreement text to ${lang.name} (${lang.code}). ` +
                           `Return ONLY the translated markdown text, preserving all markdown ` +
                           `formatting exactly. No explanation or preamble:\n\n${form.ndaText}`,
                }],
              });
              const translated = ((res.data?.choices?.[0]?.message?.content) as string || '').trim();
              if (translated) { ndaPayload[`text_${lang.code}`] = translated; }
              else             { failedLangs.push(lang.nameNative || lang.name); }
            } catch { failedLangs.push(lang.nameNative || lang.name); }
          }

          setTranslating(false);
          setTranslationStatus('');

          if (failedLangs.length > 0) {
            addToast(t('tab6_translate_partial', 'Translation failed for: {langs}').replace('{langs}', failedLangs.join(', ')), 'warning');
          }
        }
      }

      // Only include nda in payload when something nda-related changed
      const ndaChanged = form.ndaText     !== original.ndaText
                      || form.ndaTitle    !== original.ndaTitle
                      || form.ndaShowMode !== original.ndaShowMode;

      const savePayload: Record<string, unknown> = {
        notifications: { showVersion: form.showVersion },
      };
      if (ndaChanged) savePayload.nda = ndaPayload;

      await configApi.save(savePayload);

      setOriginal(form);
      setHasChanges(false);
      addToast(t('tab6_save_success', 'Settings saved'), 'success');
    } catch (e: any) {
      addToast(t('tab6_save_fail', 'Save failed') + ': ' + e.message, 'error');
    }
    setSaving(false);
  }, [form, original, languages, addToast, t, loading]);

  const handleReset = useCallback(() => {
    if (!window.confirm(t('admin_discard_changes', 'Discard all unsaved changes?'))) return;
    setForm(original);
    setHasChanges(false);
  }, [original, t]);

  useImperativeHandle(ref, () => ({
    save: handleSave,
    reset: handleReset,
    get hasChanges() { return hasChanges; },
    get saving()     { return saving; },
  }), [handleSave, handleReset, hasChanges, saving]);

  const insertMarkdown = useCallback((before: string, after = '') => {
    const el = ndaRef.current;
    if (!el) return;
    const start = el.selectionStart, end = el.selectionEnd;
    const selected = el.value.substring(start, end);
    const newVal = el.value.substring(0, start) + before + selected + after + el.value.substring(end);
    update('ndaText', newVal);
    requestAnimationFrame(() => {
      el.selectionStart = start + before.length;
      el.selectionEnd   = start + before.length + selected.length;
      el.focus();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, fontSize: 13, color: 'var(--text-muted)' }}>
        {t('lt_loading', 'Loading\u2026')}
      </div>
    );
  }

  const currentVersion = identity?.version || '';

  return (
    <div>

      {/* ── 1. VERSION DISPLAY ─────────────────────────────────────────────── */}
      <div style={cardSt}>
        <SectionHeading color="var(--blue)" label={t('tab6_version_section', 'Version Display')} />
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 14 }}>
          {t('tab6_version_desc', 'Control whether the project version number is visible to all users.')}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          onClick={() => update('showVersion', !form.showVersion)}>
          <Toggle on={form.showVersion} onChange={() => update('showVersion', !form.showVersion)} />
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
              {t('tab6_show_version', 'Show version number to users')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {form.showVersion
                ? t('tab6_version_shown', 'Version is visible in the interface')
                : t('tab6_version_hidden', 'Version is hidden from users')}
              {currentVersion ? ` \u2014 ${t('tab6_current_version', 'Current version')}: ${currentVersion}` : ''}
            </div>
          </div>
        </label>
      </div>

      {/* ── 2. SITE AGREEMENT ──────────────────────────────────────────────── */}
      <div style={cardSt}>
        <SectionHeading color="var(--accent)" label={t('tab6_nda_section', 'Site Agreement')} />
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 16 }}>
          {t('tab6_nda_desc', 'Shown to users before accessing the portal. Supports Markdown: **bold**, *italic*, # Heading, - Bullet')}
        </div>

        {/* Agreement Title */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelSt}>{t('tab6_nda_title_label', 'Agreement Title')}</label>
          <input
            type="text"
            value={form.ndaTitle}
            onChange={e => update('ndaTitle', e.target.value)}
            placeholder={t('tab6_nda_title_ph', 'e.g. Site Agreement, Non-Disclosure Agreement')}
            style={inputSt}
          />
          <p style={hintSt}>{t('tab6_nda_title_hint', 'Displayed as the modal heading. Leave blank to use the default title.')}</p>
        </div>

        {/* Markdown toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
          {[
            { label: t('tab6_nda_h1', 'H1'),     action: () => insertMarkdown('# ') },
            { label: t('tab6_nda_h2', 'H2'),     action: () => insertMarkdown('## ') },
            { label: t('tab6_nda_h3', 'H3'),     action: () => insertMarkdown('### ') },
            { label: t('tab6_nda_bold', 'B'),    action: () => insertMarkdown('**', '**'), bold: true },
            { label: t('tab6_nda_italic', 'I'),  action: () => insertMarkdown('*', '*'), italic: true },
            { label: t('tab6_nda_bullet', '\u2022'), action: () => insertMarkdown('- ') },
          ].map(btn => (
            <button key={btn.label} onClick={btn.action}
              style={{ padding: '4px 9px', borderRadius: 4, border: '1px solid var(--border)',
                background: 'var(--bg-overlay)', color: 'var(--text-secondary)', fontSize: 12,
                fontWeight: btn.bold ? 700 : 400, fontStyle: btn.italic ? 'italic' : 'normal',
                cursor: 'pointer', lineHeight: 1 }}>
              {btn.label}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            <button onClick={() => setShowPreview(false)}
              style={{ padding: '4px 10px', borderRadius: 4,
                border: `1px solid ${!showPreview ? 'var(--accent)' : 'var(--border)'}`,
                background: !showPreview ? 'var(--accent-dim)' : 'none',
                color: !showPreview ? 'var(--accent)' : 'var(--text-muted)', fontSize: 11, cursor: 'pointer' }}>
              {t('tab6_nda_edit_btn', 'Edit')}
            </button>
            <button onClick={() => setShowPreview(true)}
              style={{ padding: '4px 10px', borderRadius: 4,
                border: `1px solid ${showPreview ? 'var(--accent)' : 'var(--border)'}`,
                background: showPreview ? 'var(--accent-dim)' : 'none',
                color: showPreview ? 'var(--accent)' : 'var(--text-muted)', fontSize: 11, cursor: 'pointer' }}>
              {t('tab6_nda_preview_btn', 'Preview')}
            </button>
          </div>
        </div>

        {!showPreview ? (
          <textarea
            ref={ndaRef}
            value={form.ndaText}
            onChange={e => update('ndaText', e.target.value)}
            placeholder={DEFAULT_AGREEMENT_TEXT}
            rows={12}
            style={{ ...inputSt, fontFamily: "'DM Mono', monospace", fontSize: 12, resize: 'vertical', lineHeight: 1.6, minHeight: 200 }}
          />
        ) : (
          <div
            style={{ minHeight: 200, padding: '12px 14px', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', background: 'var(--bg-overlay)',
              fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}
            dangerouslySetInnerHTML={{
              __html: form.ndaText.trim()
                ? renderMarkdown(form.ndaText)
                : `<span style="color:var(--text-muted);font-style:italic">${t('tab6_nda_preview_empty', 'Nothing to preview \u2014 add content in Edit mode.')}</span>`,
            }}
          />
        )}

        {translating && translationStatus && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', flexShrink: 0, animation: 'spin 0.8s linear infinite' }} />
            {translationStatus}
          </div>
        )}

        {/* ── Show Agreement toggle ────────────────────────────────────────── */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <label style={labelSt}>{t('tab6_show_mode_label', 'Show Agreement')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {([
              { value: 'every_login' as const, label: t('tab6_show_every_login', 'Every login') },
              { value: 'once'        as const, label: t('tab6_show_once',        'Once per account') },
            ] as const).map(opt => (
              <button
                key={opt.value}
                onClick={() => update('ndaShowMode', opt.value)}
                style={{
                  padding: '7px 16px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s',
                  border:      form.ndaShowMode === opt.value ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background:  form.ndaShowMode === opt.value ? 'rgba(99,102,241,0.08)' : 'var(--bg-overlay)',
                  color:       form.ndaShowMode === opt.value ? 'var(--accent)' : 'var(--text-secondary)',
                }}>
                {opt.label}
              </button>
            ))}
          </div>
          <p style={hintSt}>
            {form.ndaShowMode === 'once'
              ? t('tab6_show_once_hint', 'User accepts once and is never prompted again.')
              : t('tab6_show_every_login_hint', 'User must accept on every login. Recommended for NDA mode.')}
          </p>
        </div>
      </div>

    </div>
  );
});

NotificationsTab.displayName = 'NotificationsTab';
export default NotificationsTab;
