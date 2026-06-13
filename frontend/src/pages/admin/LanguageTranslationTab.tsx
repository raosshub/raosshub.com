import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate }                 from 'react-router-dom';
import { useUIStore }                  from '@/stores/useUIStore';
import { useI18nStore }             from '@/stores/useI18nStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { languageApi, i18nApi, kimiApi, configApi } from '@/utils/api';
import { Icons } from '@/components/icons';
import type { Language } from '@/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const isNoApiKey = (e: any): boolean =>
  e?.response?.status === 503 &&
  (e?.response?.data?.error === 'no_api_key' ||
   e?.response?.data?.error === 'no-api-key');

function extractJSON(text: string): any {
  try { return JSON.parse(text); } catch {}
  const m = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

/**
 * Guard: true only for plain JS objects — not null, not array, not primitive.
 * Must pass before calling saveLocaleContent. Without this, an unexpected Kimi
 * response (array, string, null) reaches the backend as a non-Map value,
 * causing a ClassCastException → 500 in 26ms.
 */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface TranslationRow {
  key:      string;
  label:    string;
  status:   'pending' | 'translating' | 'done' | 'error';
  selected: boolean;
  error?:   string;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const cardSt:   React.CSSProperties = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 20px', marginBottom: 14 };
const labelSt:  React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 5, display: 'block' };
const inputSt:  React.CSSProperties = { width: '100%', padding: '8px 11px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const selectSt: React.CSSProperties = { ...inputSt, cursor: 'pointer' };

function SectionHeading({ color, label }: { color: string; label: string }) {
  return (
    <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
      <span style={{ width: 3, height: 14, background: color, borderRadius: 2, flexShrink: 0 }} />
      {label}
    </h3>
  );
}

const STATUS_COLOR: Record<TranslationRow['status'], string> = {
  pending:     'var(--text-muted)',
  translating: 'var(--orange)',
  done:        '#059669',
  error:       'var(--red)',
};

// ─── Language lookup (35 common languages) ────────────────────────────────────
// Shown in the Add Language dropdown so the admin never has to know a code or
// native name. Options sorted alphabetically by English name.
const LANG_LOOKUP: Record<string, { name: string; nameNative: string; isRtl: boolean }> = {
  af:      { name: 'Afrikaans',             nameNative: 'Afrikaans',          isRtl: false },
  ar:      { name: 'Arabic',                nameNative: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629',             isRtl: true  },
  bn:      { name: 'Bengali',               nameNative: '\u09ac\u09be\u0982\u09b2\u09be',               isRtl: false },
  cs:      { name: 'Czech',                 nameNative: '\u010ce\u0161tina',             isRtl: false },
  da:      { name: 'Danish',                nameNative: 'Dansk',               isRtl: false },
  de:      { name: 'German',                nameNative: 'Deutsch',             isRtl: false },
  el:      { name: 'Greek',                 nameNative: '\u0395\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac',            isRtl: false },
  es:      { name: 'Spanish',               nameNative: 'Espa\u00f1ol',             isRtl: false },
  fa:      { name: 'Persian',               nameNative: '\u0641\u0627\u0631\u0633\u06cc',               isRtl: true  },
  fi:      { name: 'Finnish',               nameNative: 'Suomi',               isRtl: false },
  fr:      { name: 'French',                nameNative: 'Fran\u00e7ais',            isRtl: false },
  he:      { name: 'Hebrew',                nameNative: '\u05e2\u05d1\u05e8\u05d9\u05ea',               isRtl: true  },
  hi:      { name: 'Hindi',                 nameNative: '\u0939\u093f\u0928\u094d\u0926\u0940',              isRtl: false },
  hu:      { name: 'Hungarian',             nameNative: 'Magyar',              isRtl: false },
  id:      { name: 'Indonesian',            nameNative: 'Bahasa Indonesia',    isRtl: false },
  it:      { name: 'Italian',               nameNative: 'Italiano',            isRtl: false },
  ja:      { name: 'Japanese',              nameNative: '\u65e5\u672c\u8a9e',              isRtl: false },
  ko:      { name: 'Korean',                nameNative: '\ud55c\uad6d\uc5b4',               isRtl: false },
  ms:      { name: 'Malay',                 nameNative: 'Bahasa Melayu',       isRtl: false },
  nl:      { name: 'Dutch',                 nameNative: 'Nederlands',          isRtl: false },
  no:      { name: 'Norwegian',             nameNative: 'Norsk',               isRtl: false },
  pl:      { name: 'Polish',                nameNative: 'Polski',              isRtl: false },
  pt:      { name: 'Portuguese',            nameNative: 'Portugu\u00eas',           isRtl: false },
  ro:      { name: 'Romanian',              nameNative: 'Rom\u00e2n\u0103',              isRtl: false },
  ru:      { name: 'Russian',               nameNative: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439',             isRtl: false },
  sv:      { name: 'Swedish',               nameNative: 'Svenska',             isRtl: false },
  sw:      { name: 'Swahili',               nameNative: 'Kiswahili',           isRtl: false },
  th:      { name: 'Thai',                  nameNative: '\u0e20\u0e32\u0e29\u0e32\u0e44\u0e17\u0e22',             isRtl: false },
  tr:      { name: 'Turkish',               nameNative: 'T\u00fcrk\u00e7e',              isRtl: false },
  uk:      { name: 'Ukrainian',             nameNative: '\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430',          isRtl: false },
  ur:      { name: 'Urdu',                  nameNative: '\u0627\u0631\u062f\u0648',                isRtl: true  },
  vi:      { name: 'Vietnamese',            nameNative: 'Ti\u1ebfng Vi\u1ec7t',          isRtl: false },
  zh:      { name: 'Chinese',               nameNative: '\u4e2d\u6587',                isRtl: false },
  'zh-tw': { name: 'Chinese (Traditional)', nameNative: '\u7e41\u9ad4\u4e2d\u6587',            isRtl: false },
};

// ─── Component ────────────────────────────────────────────────────────────────
interface LanguageTranslationTabProps {
  tabContext?:                any;
  onNavigateToIntegrations?:  (ctx: any) => void;
  onClearContext?:            () => void;
  /** Called whenever the translation running state changes.
   *  AdminSetupPage uses this to block tab switches during translation. */
  onRunningChange?:           (running: boolean) => void;
}

export default function LanguageTranslationTab({ onRunningChange }: LanguageTranslationTabProps) {
  const { t, languages, currentLang, defaultLang, loadLanguages, loadUiStrings } = useI18nStore();
  const { addToast } = useNotificationStore();
  const navigate     = useNavigate();

  const [allLanguages,    setAllLanguages]    = useState<Language[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [targetCode,      setTargetCode]      = useState('');
  const [rows,            setRows]            = useState<TranslationRow[]>([]);
  const [running,         setRunning]         = useState(false);
  const [progress,        setProgress]        = useState(0);
  const [showAddForm,     setShowAddForm]      = useState(false);
  const [newCode,         setNewCode]         = useState('');
  const [newName,         setNewName]         = useState('');
  const [newNative,       setNewNative]       = useState('');
  const [newRtl,          setNewRtl]          = useState(false);
  const [selectedLookupKey, setSelectedLookupKey] = useState('');
  const abortRef = useRef(false);

  // ── Warning modal state ───────────────────────────────────────────────────
  const [showWarning, setShowWarning] = useState(false);
  const [warnLang,    setWarnLang]    = useState<{
    id: number; code: string; name: string; native: string;
  } | null>(null);

  const updateRow = useCallback((key: string, patch: Partial<TranslationRow>) =>
    setRows(prev => prev.map(r => r.key === key ? { ...r, ...patch } : r)),
  []);

  // ── Notify parent + update global store when running state changes ──────────
  // AdminSetupPage uses onRunningChange to block in-page tab switches.
  // AppLayout reads useUIStore to block sidebar navigation.
  useEffect(() => {
    onRunningChange?.(running);
    useUIStore.getState().setTranslationRunning(running);
  }, [running, onRunningChange]);

  // ── Abort translation + clear store when tab unmounts ────────────────────
  useEffect(() => () => {
    abortRef.current = true;
    useUIStore.getState().setTranslationRunning(false);
  }, []);

  // ── Load all languages ────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await languageApi.getAll();
      setAllLanguages(res.data.data || []);
    } catch {
      addToast(t('lt_loading', 'Loading\u2026'), 'error');
    }
    setLoading(false);
  }, [addToast, t]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Set default language ──────────────────────────────────────────────────
  // Does NOT navigate directly — shows warning modal first.
  // Flow 2 wizard enforces: credentials → kimi key → factory reset →
  // reseed → verify → set default.
  const handleSetDefault = useCallback((id: number, code: string) => {
    const lang = allLanguages.find(l => l.id === id);
    setWarnLang({
      id,
      code,
      name:   lang?.name       || code,
      native: lang?.nameNative || code,
    });
    setShowWarning(true);
  }, [allLanguages]);

  // ── Warning modal: proceed ────────────────────────────────────────────────
  const handleWarnProceed = useCallback(() => {
    if (!warnLang) return;
    setShowWarning(false);
    // Write to sessionStorage as fallback — React Router state can be lost on
    // StrictMode double-mount. ChangeDefaultLanguagePage reads this if state is null.
    try {
      sessionStorage.setItem('hub_cdl_state', JSON.stringify({
        langId:     warnLang.id,
        langCode:   warnLang.code,
        langName:   warnLang.name,
        langNative: warnLang.native,
      }));
    } catch {}
    navigate('/admin/change-default-language', {
      state: {
        langId:     warnLang.id,
        langCode:   warnLang.code,
        langName:   warnLang.name,
        langNative: warnLang.native,
      },
    });
  }, [warnLang, navigate]);

  // ── Warning modal: cancel ─────────────────────────────────────────────────
  const handleWarnCancel = useCallback(() => {
    setShowWarning(false);
    setWarnLang(null);
  }, []);

  // ── Toggle active ─────────────────────────────────────────────────────────
  const handleToggleActive = useCallback(async (lang: Language) => {
    try {
      await languageApi.update(lang.id, { isActive: !lang.isActive });
      await loadAll();
      addToast(lang.isActive ? t('lt_lang_deactivated', 'Language deactivated') : t('lt_lang_activated', 'Language activated'), 'success');
    } catch {
      addToast(t('lt_error', 'Error'), 'error');
    }
  }, [loadAll, addToast, t]);

  // ── Add language ──────────────────────────────────────────────────────────
  const handleAddLanguage = useCallback(async () => {
    if (!newCode.trim() || !newName.trim() || !newNative.trim()) return;
    try {
      await languageApi.create({ code: newCode.trim().toLowerCase(), name: newName.trim(), nameNative: newNative.trim(), isRtl: newRtl });
      await loadAll();
      setShowAddForm(false); setNewCode(''); setNewName(''); setNewNative(''); setNewRtl(false); setSelectedLookupKey('');
      addToast(t('lt_lang_added', 'Language added'), 'success');
    } catch {
      addToast(t('lt_error', 'Error'), 'error');
    }
  }, [newCode, newName, newNative, newRtl, loadAll, addToast, t]);

  // When admin selects from the language dropdown, auto-fill all three fields.
  // '__custom__' clears all fields for manual entry.
  const handleLookupSelect = useCallback((code: string) => {
    setSelectedLookupKey(code);
    if (code === '__custom__') {
      setNewCode(''); setNewName(''); setNewNative(''); setNewRtl(false);
    } else if (code && LANG_LOOKUP[code]) {
      const entry = LANG_LOOKUP[code];
      setNewCode(code);
      setNewName(entry.name);
      setNewNative(entry.nameNative);
      setNewRtl(entry.isRtl);
    }
  }, []);

  // UI strings: always from EN (DataInitializer seeds EN — it is the canonical source).
  // Locale content sections: from defaultLang (content is authored in the default language).
  const handlePreflight = useCallback(async () => {
    if (!targetCode) return;
    setRows([]);
    const newRows: TranslationRow[] = [];

    // UI strings — always from EN
    try {
      const uiRes = await i18nApi.getUiStrings('en');
      const keys  = Object.keys(uiRes.data.data || {});
      if (keys.length > 0) {
        newRows.push({ key: '__ui_strings__', label: t('lt_ui_strings_label', 'UI Strings') + ` (${keys.length})`, status: 'pending', selected: true });
      }
    } catch {}

    // Locale content sections — from defaultLang (where content was authored)
    try {
      const secRes  = await i18nApi.getSections(defaultLang);
      const sections: string[] = secRes.data.data || [];
      sections.forEach(path => {
        newRows.push({ key: path, label: path, status: 'pending', selected: true });
      });
    } catch {}

    // Site Agreement (NDA) — always from text_en
    try {
      const cfgRes = await configApi.get();
      const ndaEn  = ((cfgRes.data?.data?.nda as any)?.text_en || '').trim();
      if (ndaEn) {
        newRows.push({ key: '__nda__', label: t('lt_nda_label', 'Site Agreement'), status: 'pending', selected: true });
      }
    } catch {}

    if (newRows.length === 0) {
      addToast(t('lt_no_sections', 'No content sections found. Add content in Dashboard Settings first.'), 'info');
      return;
    }
    setRows(newRows);
  }, [targetCode, defaultLang, addToast, t]);

  // ── Run translation ───────────────────────────────────────────────────────
  // UI strings SOURCE is always EN (DataInitializer seeds EN as canonical source).
  // Locale content SOURCE is defaultLang (content is authored in the default language).
  // TARGET is the selected targetCode — any active language including the default.
  const handleStartTranslation = useCallback(async () => {
    const selectedRows = rows.filter(r => r.selected);
    if (!targetCode || selectedRows.length === 0 || running) return;

    abortRef.current = false;
    setRunning(true);
    setProgress(0);

    let done = 0;
    const total = selectedRows.length;

    // UI strings always from EN — DataInitializer seeds EN as the canonical source.
    // Locale content sections from defaultLang — that is where content is authored.
    const enLang             = allLanguages.find(l => l.code === 'en');
    const contentSourceLang  = allLanguages.find(l => l.code === defaultLang);
    const targetLang         = allLanguages.find(l => l.code === targetCode);
    const uiSourceLabel      = enLang?.name || 'English';
    const contentSourceLabel = contentSourceLang?.name || defaultLang;
    const targetLabel = targetLang?.name || targetCode;

    for (const row of selectedRows) {
      if (abortRef.current) { break; }

      updateRow(row.key, { status: 'translating' });

      try {
        // ── UI Strings ───────────────────────────────────────────────
        if (row.key === '__ui_strings__') {
          const uiRes = await i18nApi.getUiStrings('en'); // Always from EN
          const allKeys = Object.entries(uiRes.data.data || {}) as [string, string][];

          // Translate in batches of 50
          const BATCH = 50;
          for (let i = 0; i < allKeys.length; i += BATCH) {
            if (abortRef.current) break;
            const batch = Object.fromEntries(allKeys.slice(i, i + BATCH));
            try {
              const res = await kimiApi.chat({
                model: 'moonshot-v1-8k',
                max_tokens: 2000,
                messages: [{
                  role: 'user',
                  content: `Translate these UI strings from ${uiSourceLabel} to ${targetLabel}. Keep keys identical. Only translate the values. Return ONLY valid JSON, no explanation, no markdown.\n${JSON.stringify(batch)}`,
                }],
              });

              const text = res.data?.choices?.[0]?.message?.content || '';
              const parsed = extractJSON(text);
              if (isPlainObject(parsed)) {
                for (const [key, value] of Object.entries(parsed)) {
                  if (typeof value === 'string') {
                    await i18nApi.saveUiString(key, targetCode, value);
                  }
                }
              }
            } catch (e) {
              if (isNoApiKey(e)) {
                abortRef.current = true;
                addToast(t('lt_translation_aborted', 'Translation stopped \u2014 Kimi API key not configured.'), 'error');
                updateRow(row.key, { status: 'error', error: t('lt_no_api_key_msg', 'No Kimi API key configured.') });
                break;
              }
            }
          }

          if (!abortRef.current) updateRow(row.key, { status: 'done' });

        } else if (row.key === '__nda__') {
          // ── Site Agreement (NDA) ──────────────────────────────────
          // Always translates text_en → text_{targetCode}.
          // Spreads existing nda object to preserve text_en, title, showMode.
          const cfgRes     = await configApi.get();
          const currentNda = ((cfgRes.data?.data?.nda as Record<string, unknown>) || {});
          const ndaEn      = (currentNda.text_en as string || '').trim();
          if (ndaEn) {
            const res = await kimiApi.chat({
              model: 'moonshot-v1-32k',
              max_tokens: 3000,
              messages: [{
                role: 'user',
                content: `Translate this Site Agreement from English to ${targetLabel}. Preserve all Markdown formatting (# headings, **bold**, - bullets). Return ONLY the translated text, no explanation.\n\n${ndaEn}`,
              }],
            });
            const translated = (res.data?.choices?.[0]?.message?.content || '').trim();
            if (translated) {
              // Spread existing nda to preserve text_en, title, showMode
              await configApi.save({ nda: { ...currentNda, [`text_${targetCode}`]: translated } });
            }
          }
          updateRow(row.key, { status: 'done' });

        } else {
          // ── Locale content section ────────────────────────────────
          const secRes = await i18nApi.getLocaleSection(defaultLang, row.key);
          const content = secRes.data?.data;
          if (!content || Object.keys(content).length === 0) {
            updateRow(row.key, { status: 'done' });
          } else {
            const res = await kimiApi.chat({
              model: 'moonshot-v1-32k',
              max_tokens: 4000,
              messages: [{
                role: 'user',
                content: `Translate all text values in this JSON from ${contentSourceLabel} to ${targetLabel}. Keep JSON structure and keys identical. Only translate text values \u2014 do not translate IDs, status values (Planned, In Progress, Completed, Delayed, On Hold), dates, or technical identifiers. Return ONLY valid JSON, no explanation, no markdown.\n${JSON.stringify(content)}`,
              }],
            });

            const text = res.data?.choices?.[0]?.message?.content || '';
            const parsed = extractJSON(text);
            // Guard: only save if Kimi returned a plain object.
            // Prevents ClassCastException 500 when Kimi returns array/string/null.
            if (isPlainObject(parsed)) {
              await i18nApi.saveLocaleContent(targetCode, row.key, parsed, 'kimi-translation');
            }
            updateRow(row.key, { status: 'done' });
          }
        }
      } catch (e) {
        if (isNoApiKey(e)) {
          abortRef.current = true;
          addToast(t('lt_translation_aborted', 'Translation stopped \u2014 Kimi API key not configured.'), 'error');
          updateRow(row.key, { status: 'error', error: t('lt_no_api_key_msg', 'No Kimi API key configured.') });
          break;
        }
        updateRow(row.key, { status: 'error', error: (e as any)?.message || 'error' });
      }

      done++;
      setProgress(Math.round((done / total) * 100));
    }

    setRunning(false);
    if (!abortRef.current) {
      addToast(t('lt_complete', 'Translation complete'), 'success');
      // Reload UI strings if we just translated the current language
      if (targetCode === currentLang) {
        loadUiStrings(currentLang);
      }
    }
  }, [targetCode, rows, running, defaultLang, allLanguages, addToast, t, updateRow, currentLang, loadUiStrings]);

  const handleStop = () => { abortRef.current = true; };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, fontSize: 13, color: 'var(--text-muted)' }}>{t('lt_loading', 'Loading\u2026')}</div>;
  }

  const defaultLangObj = allLanguages.find(l => l.code === defaultLang);
  const nonDefaultLangs = allLanguages.filter(l => !l.isDefault);

  return (
    <div>

      {/* ── WARNING MODAL ─────────────────────────────────────────────────── */}
      {showWarning && warnLang && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}>
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid rgba(248,81,73,0.5)',
            borderRadius: 'var(--radius)',
            padding: '28px 32px',
            maxWidth: 480, width: '100%',
            boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(248,81,73,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 800, color: 'var(--red)',
              }}>
                !
              </div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--red)', margin: 0 }}>
                {t('change_lang_warning_title', 'This will delete all data')}
              </h2>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>
              {t('change_lang_warning_desc', 'Changing the default language on a live system requires a factory reset. ALL team content, files, locale content, and configuration will be permanently deleted. Only superadmin users are preserved.')}
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleWarnProceed}
                style={{
                  padding: '10px 18px', borderRadius: 'var(--radius-sm)', border: 'none',
                  background: 'var(--red)', color: 'white',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', flex: 1,
                }}>
                {t('change_lang_warning_proceed', 'I understand \u2014 proceed')}
              </button>
              <button
                onClick={handleWarnCancel}
                style={{
                  padding: '10px 18px', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)', background: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                {t('btn_cancel', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 1. DEFAULT LANGUAGE ────────────────────────────────────────────── */}
      <div style={cardSt}>
        <SectionHeading color="var(--accent)" label={t('lt_default_lang_section', 'Default Language')} />
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.6 }}>
          {t('lt_default_lang_desc', 'All content is authored in this language. Kimi translates from here to every new language.')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {defaultLangObj ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', flex: 1 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {defaultLangObj.nameNative} ({defaultLangObj.name})
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {defaultLangObj.code.toUpperCase()} {defaultLangObj.isRtl ? `\u00b7 ${t('lt_rtl', 'RTL')}` : ''}
                </div>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(99,102,241,0.3)' }}>
                {t('lt_default_badge', 'Default')}
              </span>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('lt_loading', 'Loading\u2026')}</div>
          )}
        </div>
      </div>

      {/* ── 2. ACTIVE LANGUAGES ───────────────────────────────────────────── */}
      <div style={cardSt}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <SectionHeading color="var(--blue)" label={t('lt_active_languages', 'Active Languages')} />
          <button onClick={() => setShowAddForm(!showAddForm)}
            style={{ padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent)', background: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icons.plus size={13} /> {t('lt_add_language', 'Add Language')}
          </button>
        </div>

        {/* Language list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: showAddForm ? 14 : 0 }}>
          {allLanguages.map(lang => (
            <div key={lang.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {lang.nameNative}
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>({lang.name})</span>
                  {lang.isDefault && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                      {t('lt_default_badge', 'Default')}
                    </span>
                  )}
                  {lang.isRtl && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                      {t('lt_rtl', 'RTL')}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{lang.code.toUpperCase()}</div>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                {!lang.isDefault && (
                  <button onClick={() => handleSetDefault(lang.id, lang.code)}
                    style={{ padding: '5px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'none', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer' }}>
                    {t('lt_set_default', 'Set Default')}
                  </button>
                )}
                <button onClick={() => handleToggleActive(lang)}
                  style={{ padding: '5px 12px', borderRadius: 'var(--radius-sm)', border: `1px solid ${lang.isActive ? 'var(--accent)' : 'var(--border)'}`, background: 'none', color: lang.isActive ? 'var(--accent)' : 'var(--text-muted)', fontSize: 11, cursor: 'pointer' }}>
                  {lang.isActive ? t('lt_lang_activated', 'Active') : t('lt_lang_deactivated', 'Inactive')}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add language form */}
        {showAddForm && (
          <div style={{ padding: 14, background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginTop: 8 }}>

            {/* Step 1 — select from list */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelSt}>{t('lt_select_language', 'Select Language')}</label>
              <select
                value={selectedLookupKey}
                onChange={e => handleLookupSelect(e.target.value)}
                style={selectSt}
              >
                <option value="">{t('lt_select_language', 'Select a language\u2026')}</option>
                {Object.entries(LANG_LOOKUP)
                  .filter(([code]) => !allLanguages.some(l => l.code === code))
                  .sort(([, a], [, b]) => a.name.localeCompare(b.name))
                  .map(([code, entry]) => (
                    <option key={code} value={code}>
                      {entry.name} \u2014 {entry.nameNative}
                    </option>
                  ))}
                <option value="__custom__">{t('lt_custom_language', 'Other / Custom (enter manually)')}</option>
              </select>
            </div>

            {/* Step 2 — confirm or override the filled fields */}
            {selectedLookupKey !== '' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={labelSt}>{t('lt_lang_code', 'Language Code')}</label>
                    <input
                      value={newCode}
                      onChange={e => setNewCode(e.target.value)}
                      placeholder="fr"
                      maxLength={10}
                      style={{ ...inputSt, background: selectedLookupKey !== '__custom__' ? 'rgba(5,150,105,0.06)' : 'var(--bg-input)' }}
                    />
                  </div>
                  <div>
                    <label style={labelSt}>{t('lt_lang_name_en', 'Language Name (English)')}</label>
                    <input
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="French"
                      style={{ ...inputSt, background: selectedLookupKey !== '__custom__' ? 'rgba(5,150,105,0.06)' : 'var(--bg-input)' }}
                    />
                  </div>
                  <div>
                    <label style={labelSt}>{t('lt_lang_name_native', 'Native Name')}</label>
                    <input
                      value={newNative}
                      onChange={e => setNewNative(e.target.value)}
                      placeholder="Fran\u00e7ais"
                      style={{ ...inputSt, background: selectedLookupKey !== '__custom__' ? 'rgba(5,150,105,0.06)' : 'var(--bg-input)' }}
                    />
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: 12 }}>
                  <input type="checkbox" checked={newRtl} onChange={e => setNewRtl(e.target.checked)} />
                  {t('lt_rtl_direction', 'Right-to-left text direction')}
                  {newRtl && <span style={{ fontSize: 10, color: 'var(--orange)', marginLeft: 4 }}>RTL layout will be applied</span>}
                </label>
              </>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleAddLanguage}
                disabled={!newCode.trim() || !newName.trim() || !newNative.trim()}
                style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--accent)', color: 'var(--text-inverse)', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (!newCode.trim() || !newName.trim() || !newNative.trim()) ? 0.5 : 1 }}>
                {t('lt_add_btn', 'Add')}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setSelectedLookupKey(''); setNewCode(''); setNewName(''); setNewNative(''); setNewRtl(false); }}
                style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'none', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
                {t('lt_cancel', 'Cancel')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. AI TRANSLATION ─────────────────────────────────────────────── */}
      <div style={cardSt}>
        <SectionHeading color="var(--purple)" label={t('lt_ai_translation', 'AI Translation')} />

        {/* TARGET only — source is always EN internally (never shown to avoid confusion) */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelSt}>{t('lt_target_lang', 'Target Language')}</label>
          <select value={targetCode} onChange={e => { setTargetCode(e.target.value); setRows([]); }} style={selectSt}>
            <option value="">{t('lt_translate_to', 'Translate to') + '\u2026'}</option>
            {allLanguages.filter(l => l.isActive).map(l => (
              <option key={l.id} value={l.code}>{l.nameNative} ({l.code.toUpperCase()})</option>
            ))}
          </select>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
            {t('lt_source_always_en', 'Hub always translates from English (EN)')}
          </div>
        </div>

        {/* Pre-flight */}
        {targetCode && !running && rows.length === 0 && (
          <button onClick={handlePreflight}
            style={{ padding: '9px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--blue)', background: 'none', color: 'var(--blue)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 14 }}>
            {t('lt_preflight', 'Pre-flight check\u2026')}
          </button>
        )}

        {/* Translation rows */}
        {rows.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: 12 }}>

              {/* Header bar — select all / none + count */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-overlay)' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {rows.filter(r => r.selected).length} / {rows.length} {t('lt_selected', 'selected')}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button disabled={running}
                    onClick={() => setRows(prev => prev.map(r => ({ ...r, selected: true })))}
                    style={{ padding: '3px 10px', borderRadius: 4, border: '1px solid var(--border)', background: 'none', color: 'var(--text-secondary)', fontSize: 11, cursor: running ? 'not-allowed' : 'pointer', opacity: running ? 0.4 : 1 }}>
                    {t('lt_select_all', 'All')}
                  </button>
                  <button disabled={running}
                    onClick={() => setRows(prev => prev.map(r => ({ ...r, selected: false })))}
                    style={{ padding: '3px 10px', borderRadius: 4, border: '1px solid var(--border)', background: 'none', color: 'var(--text-secondary)', fontSize: 11, cursor: running ? 'not-allowed' : 'pointer', opacity: running ? 0.4 : 1 }}>
                    {t('lt_select_none', 'None')}
                  </button>
                </div>
              </div>

              {rows.map((row, i) => (
                <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: i < rows.length - 1 ? '1px solid var(--border-subtle)' : 'none', background: row.status === 'translating' ? 'rgba(99,102,241,0.05)' : 'transparent' }}>

                  {/* Progress circle when translating; checkbox otherwise */}
                  {row.status === 'translating' ? (
                    <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--orange)', borderTopColor: 'transparent', flexShrink: 0, display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                  ) : (
                    <input type="checkbox" checked={row.selected} disabled={running}
                      onChange={() => setRows(prev => prev.map(r => r.key === row.key ? { ...r, selected: !r.selected } : r))}
                      style={{ width: 14, height: 14, flexShrink: 0, cursor: running ? 'not-allowed' : 'pointer', accentColor: 'var(--accent)' }} />
                  )}

                  <span style={{ flex: 1, fontSize: 11, color: row.selected ? 'var(--text-secondary)' : 'var(--text-muted)', fontFamily: "'DM Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: row.selected ? 1 : 0.5 }}>
                    {row.label}
                  </span>
                  <span style={{ fontSize: 11, color: STATUS_COLOR[row.status], fontWeight: 600, flexShrink: 0 }}>
                    {row.status === 'pending'     && t('lt_pending',         'Pending')}
                    {row.status === 'translating' && t('lt_translating_item','Translating')}
                    {row.status === 'done'        && t('lt_done',            'Done')}
                    {row.status === 'error'       && t('lt_error',           'Error')}
                  </span>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            {(running || progress > 0) && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                  <span>{running ? t('lt_translating_status', 'Translating\u2026') : t('lt_complete', 'Translation complete')}</span>
                  <span>{progress}%</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg-overlay)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: running ? 'var(--accent)' : '#059669', width: `${progress}%`, transition: 'width 0.3s ease', borderRadius: 2 }} />
                </div>
              </div>
            )}

            {!running ? (
              <button onClick={handleStartTranslation}
                disabled={rows.filter(r => r.selected).length === 0}
                style={{ padding: '9px 22px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--accent)', color: 'var(--text-inverse)', fontSize: 13, fontWeight: 600, cursor: rows.filter(r => r.selected).length === 0 ? 'not-allowed' : 'pointer', opacity: rows.filter(r => r.selected).length === 0 ? 0.5 : 1 }}>
                {t('lt_translate_selected', 'Translate Selected')} ({rows.filter(r => r.selected).length})
              </button>
            ) : (
              <button onClick={handleStop}
                style={{ padding: '9px 22px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--red)', background: 'none', color: 'var(--red)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {t('lt_stop', 'Stop')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
