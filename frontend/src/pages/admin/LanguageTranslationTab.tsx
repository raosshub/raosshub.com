import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useI18nStore }         from '@/stores/useI18nStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { languageApi, i18nApi, kimiApi } from '@/utils/api';
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
  ar:      { name: 'Arabic',                nameNative: 'العربية',             isRtl: true  },
  bn:      { name: 'Bengali',               nameNative: 'বাংলা',               isRtl: false },
  cs:      { name: 'Czech',                 nameNative: 'Čeština',             isRtl: false },
  da:      { name: 'Danish',                nameNative: 'Dansk',               isRtl: false },
  de:      { name: 'German',                nameNative: 'Deutsch',             isRtl: false },
  el:      { name: 'Greek',                 nameNative: 'Ελληνικά',            isRtl: false },
  es:      { name: 'Spanish',               nameNative: 'Español',             isRtl: false },
  fa:      { name: 'Persian',               nameNative: 'فارسی',               isRtl: true  },
  fi:      { name: 'Finnish',               nameNative: 'Suomi',               isRtl: false },
  fr:      { name: 'French',                nameNative: 'Français',            isRtl: false },
  he:      { name: 'Hebrew',                nameNative: 'עברית',               isRtl: true  },
  hi:      { name: 'Hindi',                 nameNative: 'हिन्दी',              isRtl: false },
  hu:      { name: 'Hungarian',             nameNative: 'Magyar',              isRtl: false },
  id:      { name: 'Indonesian',            nameNative: 'Bahasa Indonesia',    isRtl: false },
  it:      { name: 'Italian',               nameNative: 'Italiano',            isRtl: false },
  ja:      { name: 'Japanese',              nameNative: '日本語',              isRtl: false },
  ko:      { name: 'Korean',                nameNative: '한국어',               isRtl: false },
  ms:      { name: 'Malay',                 nameNative: 'Bahasa Melayu',       isRtl: false },
  nl:      { name: 'Dutch',                 nameNative: 'Nederlands',          isRtl: false },
  no:      { name: 'Norwegian',             nameNative: 'Norsk',               isRtl: false },
  pl:      { name: 'Polish',                nameNative: 'Polski',              isRtl: false },
  pt:      { name: 'Portuguese',            nameNative: 'Português',           isRtl: false },
  ro:      { name: 'Romanian',              nameNative: 'Română',              isRtl: false },
  ru:      { name: 'Russian',               nameNative: 'Русский',             isRtl: false },
  sv:      { name: 'Swedish',               nameNative: 'Svenska',             isRtl: false },
  sw:      { name: 'Swahili',               nameNative: 'Kiswahili',           isRtl: false },
  th:      { name: 'Thai',                  nameNative: 'ภาษาไทย',             isRtl: false },
  tr:      { name: 'Turkish',               nameNative: 'Türkçe',              isRtl: false },
  uk:      { name: 'Ukrainian',             nameNative: 'Українська',          isRtl: false },
  ur:      { name: 'Urdu',                  nameNative: 'اردو',                isRtl: true  },
  vi:      { name: 'Vietnamese',            nameNative: 'Tiếng Việt',          isRtl: false },
  zh:      { name: 'Chinese',               nameNative: '中文',                isRtl: false },
  'zh-tw': { name: 'Chinese (Traditional)', nameNative: '繁體中文',            isRtl: false },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function LanguageTranslationTab() {
  const { t, languages, currentLang, defaultLang, loadLanguages, loadUiStrings } = useI18nStore();
  const { addToast } = useNotificationStore();

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

  const updateRow = useCallback((key: string, patch: Partial<TranslationRow>) =>
    setRows(prev => prev.map(r => r.key === key ? { ...r, ...patch } : r)),
  []);

  // ── Load all languages ────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await languageApi.getAll();
      setAllLanguages(res.data.data || []);
    } catch {
      addToast(t('lt_loading', 'Loading…'), 'error');
    }
    setLoading(false);
  }, [addToast, t]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Set default language ──────────────────────────────────────────────────
  const handleSetDefault = useCallback(async (id: number, code: string) => {
    try {
      await languageApi.setDefault(id);
      await loadLanguages();
      await loadAll();
      addToast(t('lt_default_changed', 'Default language updated'), 'success');
    } catch {
      addToast(t('lt_error', 'Error'), 'error');
    }
  }, [loadLanguages, loadAll, addToast, t]);

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

  // ── Pre-flight check ──────────────────────────────────────────────────────
  // Uses defaultLang as source — not hardcoded 'en'.
  const handlePreflight = useCallback(async () => {
    if (!targetCode) return;
    setRows([]);
    const newRows: TranslationRow[] = [];

    // UI strings (from default language)
    try {
      const uiRes = await i18nApi.getUiStrings(defaultLang);
      const keys  = Object.keys(uiRes.data.data || {});
      if (keys.length > 0) {
        newRows.push({ key: '__ui_strings__', label: t('lt_ui_strings_label', 'UI Strings') + ` (${keys.length})`, status: 'pending', selected: true });
      }
    } catch {}

    // Locale content sections (from default language)
    try {
      const secRes  = await i18nApi.getSections(defaultLang);
      const sections: string[] = secRes.data.data || [];
      sections.forEach(path => {
        newRows.push({ key: path, label: path, status: 'pending', selected: true });
      });
    } catch {}

    if (newRows.length === 0) {
      addToast(t('lt_no_sections', 'No content sections found. Add content in Dashboard Settings first.'), 'info');
      return;
    }
    setRows(newRows);
  }, [targetCode, defaultLang, addToast, t]);

  // ── Run translation ───────────────────────────────────────────────────────
  // SOURCE is always defaultLang. TARGET is the selected targetCode.
  // If targetCode === defaultLang, translation is a no-op (same language).
  const handleStartTranslation = useCallback(async () => {
    const selectedRows = rows.filter(r => r.selected);
    if (!targetCode || selectedRows.length === 0 || running) return;

    abortRef.current = false;
    setRunning(true);
    setProgress(0);

    let done = 0;
    const total = selectedRows.length;

    // Determine source language name for Kimi prompt
    const sourceLang = allLanguages.find(l => l.code === defaultLang);
    const targetLang = allLanguages.find(l => l.code === targetCode);
    const sourceLabel = sourceLang?.name || defaultLang;
    const targetLabel = targetLang?.name || targetCode;

    for (const row of selectedRows) {
      if (abortRef.current) { break; }

      updateRow(row.key, { status: 'translating' });

      try {
        // ── UI Strings ───────────────────────────────────────────────
        if (row.key === '__ui_strings__') {
          const uiRes = await i18nApi.getUiStrings(defaultLang);
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
                  content: `Translate these UI strings from ${sourceLabel} to ${targetLabel}. Keep keys identical. Only translate the values. Return ONLY valid JSON, no explanation, no markdown.\n${JSON.stringify(batch)}`,
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
                addToast(t('lt_translation_aborted', 'Translation stopped — Kimi API key not configured.'), 'error');
                updateRow(row.key, { status: 'error', error: t('lt_no_api_key_msg', 'No Kimi API key configured.') });
                break;
              }
            }
          }

          if (!abortRef.current) updateRow(row.key, { status: 'done' });

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
                content: `Translate all text values in this JSON from ${sourceLabel} to ${targetLabel}. Keep JSON structure and keys identical. Only translate text values — do not translate IDs, status values (Planned, In Progress, Completed, Delayed, On Hold), dates, or technical identifiers. Return ONLY valid JSON, no explanation, no markdown.\n${JSON.stringify(content)}`,
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
          addToast(t('lt_translation_aborted', 'Translation stopped — Kimi API key not configured.'), 'error');
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
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, fontSize: 13, color: 'var(--text-muted)' }}>{t('lt_loading', 'Loading…')}</div>;
  }

  const defaultLangObj = allLanguages.find(l => l.code === defaultLang);
  const nonDefaultLangs = allLanguages.filter(l => !l.isDefault);

  return (
    <div>

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
                  {defaultLangObj.code.toUpperCase()} {defaultLangObj.isRtl ? `· ${t('lt_rtl', 'RTL')}` : ''}
                </div>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(99,102,241,0.3)' }}>
                {t('lt_default_badge', 'Default')}
              </span>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('lt_loading', 'Loading…')}</div>
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
                <option value="">{t('lt_select_language', 'Select a language…')}</option>
                {Object.entries(LANG_LOOKUP)
                  .filter(([code]) => !allLanguages.some(l => l.code === code))
                  .sort(([, a], [, b]) => a.name.localeCompare(b.name))
                  .map(([code, entry]) => (
                    <option key={code} value={code}>
                      {entry.name} — {entry.nameNative}
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
                      placeholder="Français"
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          {/* Source (read-only = default language) */}
          <div>
            <label style={labelSt}>{t('lt_source_label', 'Source')}</label>
            <div style={{ ...inputSt, background: 'var(--bg-overlay)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
              {defaultLangObj ? `${defaultLangObj.nameNative} (${defaultLangObj.code.toUpperCase()})` : defaultLang.toUpperCase()}
            </div>
          </div>
          {/* Target */}
          <div>
            <label style={labelSt}>{t('lt_target_lang', 'Target Language')}</label>
            <select value={targetCode} onChange={e => { setTargetCode(e.target.value); setRows([]); }} style={selectSt}>
              <option value="">{t('lt_translate_to', 'Translate to')}…</option>
              {allLanguages.filter(l => l.code !== defaultLang && l.isActive).map(l => (
                <option key={l.id} value={l.code}>{l.nameNative} ({l.code.toUpperCase()})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Pre-flight */}
        {targetCode && !running && rows.length === 0 && (
          <button onClick={handlePreflight}
            style={{ padding: '9px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--blue)', background: 'none', color: 'var(--blue)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 14 }}>
            {t('lt_preflight', 'Pre-flight check…')}
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
                  <span>{running ? t('lt_translating_status', 'Translating…') : t('lt_complete', 'Translation complete')}</span>
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
