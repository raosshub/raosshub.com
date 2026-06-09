import React, { useState, useCallback } from 'react';
import { useAuthStore }    from '@/stores/useAuthStore';
import { useI18nStore }    from '@/stores/useI18nStore';
import { useConfigStore }  from '@/stores/useConfigStore';

// ─── Markdown renderer ────────────────────────────────────────────────────────
// Converts a subset of Markdown to safe HTML.
// Used to render admin-authored NDA text from project_configs.config.nda.text.
// Supported: # h1, ## h2, ### h3, **bold**, *italic*, - bullets, blank-line paragraphs.
function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function inlineFormat(text: string): string {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/_(.+?)_/g,       '<em>$1</em>');
}
function renderMarkdown(md: string): string {
  if (!md?.trim()) return '';
  const lines = md.split('\n');
  let html = '';
  let inList = false;
  for (const line of lines) {
    const t = line.trim();
    if      (t.startsWith('### ')) { if (inList) { html += '</ul>'; inList = false; } html += `<h3 style="font-size:14px;font-weight:700;color:var(--text-primary);margin:14px 0 6px">${inlineFormat(t.slice(4))}</h3>`; }
    else if (t.startsWith('## '))  { if (inList) { html += '</ul>'; inList = false; } html += `<h2 style="font-size:15px;font-weight:700;color:var(--text-primary);margin:16px 0 8px">${inlineFormat(t.slice(3))}</h2>`; }
    else if (t.startsWith('# '))   { if (inList) { html += '</ul>'; inList = false; } html += `<h1 style="font-size:17px;font-weight:700;color:var(--text-primary);margin:16px 0 8px">${inlineFormat(t.slice(2))}</h1>`; }
    else if (t.startsWith('- ') || t.startsWith('* ')) { if (!inList) { html += '<ul style="padding-left:20px;margin:8px 0">'; inList = true; } html += `<li style="margin-bottom:6px;line-height:1.6">${inlineFormat(t.slice(2))}</li>`; }
    else if (t === '')             { if (inList) { html += '</ul>'; inList = false; } html += '<br>'; }
    else                           { if (inList) { html += '</ul>'; inList = false; } html += `<p style="margin:0 0 10px;line-height:1.7">${inlineFormat(t)}</p>`; }
  }
  if (inList) html += '</ul>';
  return html;
}

// ─── Component ────────────────────────────────────────────────────────────────
const NDAModal: React.FC = () => {
  const { t, currentLang }  = useI18nStore();
  const { acceptNda, logout } = useAuthStore();
  const { nda }          = useConfigStore();
  const [checked, setChecked] = useState(false);

  const handleAgree = useCallback(async () => {
    if (!checked) return;
    await acceptNda();
  }, [checked, acceptNda]);

  // Language-aware NDA text lookup.
  // Priority: text_{currentLang} → text_en → text (backward compat) → empty (shows default)
  const ndaRecord  = nda as Record<string, unknown>;
  const ndaText    = ((ndaRecord[`text_${currentLang}`] as string | undefined) || '').trim()
                  || ((ndaRecord['text_en']              as string | undefined) || '').trim()
                  || (nda?.text || '').trim();
  const hasAdminNda = ndaText.length > 0;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'modalIn 0.25s ease' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '22px 28px', borderBottom: '1px solid var(--border)', background: 'var(--bg-overlay)' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
              {t('nda_title', 'Non-Disclosure Agreement')}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {t('nda_subtitle', 'Confidentiality & Access Terms')}
            </p>
          </div>
          <span style={{ padding: '4px 10px', borderRadius: 6, background: 'var(--red-dim)', color: 'var(--red)', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', border: '1px solid var(--red-dim)' }}>
            REQUIRED
          </span>
        </div>

        {/* Body — admin Markdown or default static content */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', maxHeight: '45vh', fontSize: 13, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
          {hasAdminNda ? (
            // Admin-authored Markdown rendered as HTML
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(ndaText) }} />
          ) : (
            // Default static content — shown until admin configures NDA text in Admin Setup → Integrations
            <ol style={{ paddingLeft: 20 }}>
              <li style={{ marginBottom: 12 }}>
                <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{t('nda_item1_title', 'Confidentiality:')}</strong>{' '}
                {t('nda_item1_body', 'All project information, including technical specifications, design files, source code, and business strategies, is strictly confidential.')}
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{t('nda_item2_title', 'Non-Disclosure:')}</strong>{' '}
                {t('nda_item2_body', 'You agree not to disclose, share, or transmit any project information to third parties without explicit written consent.')}
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{t('nda_item3_title', 'Authorized Use Only:')}</strong>{' '}
                {t('nda_item3_body', 'Access is granted for authorized project purposes only. Any unauthorized use or reproduction is strictly prohibited.')}
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{t('nda_item4_title', 'Data Protection:')}</strong>{' '}
                {t('nda_item4_body', 'All personal and project data must be handled in accordance with applicable data protection regulations.')}
              </li>
              <li style={{ marginBottom: 0 }}>
                <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{t('nda_item5_title', 'Consequences:')}</strong>{' '}
                {t('nda_item5_body', 'Violation of this agreement may result in immediate access revocation and legal action.')}
              </li>
            </ol>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '20px 28px', borderTop: '1px solid var(--border)', background: 'var(--bg-overlay)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 18 }}
            onClick={() => setChecked(v => !v)}>
            <span style={{ width: 20, height: 20, borderRadius: 5, border: checked ? '1.5px solid var(--accent)' : '1.5px solid var(--border)', background: checked ? 'var(--accent)' : 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all var(--transition)', fontSize: 11, color: 'white', fontWeight: 700 }}>
              {checked ? '✓' : ''}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', userSelect: 'none' }}>
              {t('nda_checkbox', 'I have read and agree to the confidentiality agreement.')}
            </span>
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={logout} style={{ padding: '9px 18px', borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              {t('nda_btn_decline', 'Decline & Exit')}
            </button>
            <button onClick={handleAgree} disabled={!checked} style={{ padding: '9px 18px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', fontSize: 13, fontWeight: 600, cursor: !checked ? 'not-allowed' : 'pointer', opacity: !checked ? 0.5 : 1, transition: 'opacity var(--transition)' }}>
              {t('nda_btn_agree', 'I Agree')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(NDAModal);
