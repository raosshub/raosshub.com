import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useI18nStore }          from '@/stores/useI18nStore';
import { useNotificationStore }  from '@/stores/useNotificationStore';
import { languageApi, i18nApi, kimiApi } from '@/utils/api';
import type { Language }         from '@/types';
import { Icons }                 from '@/components/icons';

// ─── Pre-populated language list ──────────────────────────────────────────────
// Auto-fills code, English name, native name, RTL flag when selected.
// EN and ZH excluded — already seeded in the DB.
const LANGUAGE_PRESETS = [
  { code: 'ar',    name: 'Arabic',                nameNative: 'العربية',         isRtl: true  },
  { code: 'bn',    name: 'Bengali',               nameNative: 'বাংলা',            isRtl: false },
  { code: 'zh-TW', name: 'Chinese Traditional',  nameNative: '繁體中文',          isRtl: false },
  { code: 'nl',    name: 'Dutch',                 nameNative: 'Nederlands',       isRtl: false },
  { code: 'fr',    name: 'French',                nameNative: 'Français',         isRtl: false },
  { code: 'de',    name: 'German',                nameNative: 'Deutsch',          isRtl: false },
  { code: 'el',    name: 'Greek',                 nameNative: 'Ελληνικά',         isRtl: false },
  { code: 'gu',    name: 'Gujarati',              nameNative: 'ગુજરાતી',           isRtl: false },
  { code: 'he',    name: 'Hebrew',                nameNative: 'עברית',            isRtl: true  },
  { code: 'hi',    name: 'Hindi',                 nameNative: 'हिन्दी',             isRtl: false },
  { code: 'id',    name: 'Indonesian',            nameNative: 'Bahasa Indonesia', isRtl: false },
  { code: 'it',    name: 'Italian',               nameNative: 'Italiano',         isRtl: false },
  { code: 'ja',    name: 'Japanese',              nameNative: '日本語',            isRtl: false },
  { code: 'kn',    name: 'Kannada',               nameNative: 'ಕನ್ನಡ',              isRtl: false },
  { code: 'ko',    name: 'Korean',                nameNative: '한국어',            isRtl: false },
  { code: 'ms',    name: 'Malay',                 nameNative: 'Bahasa Melayu',    isRtl: false },
  { code: 'mr',    name: 'Marathi',               nameNative: 'मराठी',              isRtl: false },
  { code: 'fa',    name: 'Persian (Farsi)',        nameNative: 'فارسی',            isRtl: true  },
  { code: 'pl',    name: 'Polish',                nameNative: 'Polski',           isRtl: false },
  { code: 'pt',    name: 'Portuguese',            nameNative: 'Português',        isRtl: false },
  { code: 'pa',    name: 'Punjabi',               nameNative: 'ਪੰਜਾਬੀ',             isRtl: false },
  { code: 'ro',    name: 'Romanian',              nameNative: 'Română',           isRtl: false },
  { code: 'ru',    name: 'Russian',               nameNative: 'Русский',          isRtl: false },
  { code: 'es',    name: 'Spanish',               nameNative: 'Español',          isRtl: false },
  { code: 'sw',    name: 'Swahili',               nameNative: 'Kiswahili',        isRtl: false },
  { code: 'sv',    name: 'Swedish',               nameNative: 'Svenska',          isRtl: false },
  { code: 'ta',    name: 'Tamil',                 nameNative: 'தமிழ்',              isRtl: false },
  { code: 'te',    name: 'Telugu',                nameNative: 'తెలుగు',             isRtl: false },
  { code: 'th',    name: 'Thai',                  nameNative: 'ภาษาไทย',           isRtl: false },
  { code: 'tr',    name: 'Turkish',               nameNative: 'Türkçe',           isRtl: false },
  { code: 'uk',    name: 'Ukrainian',             nameNative: 'Українська',       isRtl: false },
  { code: 'ur',    name: 'Urdu',                  nameNative: 'اردو',             isRtl: true  },
  { code: 'vi',    name: 'Vietnamese',            nameNative: 'Tiếng Việt',       isRtl: false },
  { code: 'yo',    name: 'Yoruba',                nameNative: 'Yorùbá',           isRtl: false },
] as const;

// ─── Styles ───────────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: '18px 20px', marginBottom: 14,
};
const label: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
  letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 5, display: 'block',
};
const input: React.CSSProperties = {
  width: '100%', padding: '8px 11px', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)', background: 'var(--bg-input)',
  color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
};
const select: React.CSSProperties = { ...input, cursor: 'pointer' };

function SectionHeading({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
      <span style={{ width: 3, height: 14, background: color, borderRadius: 2, flexShrink: 0 }} />
      {children}
    </h3>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface LogItem { path: string; status: 'pending' | 'done' | 'error'; }
interface SectionEntry { sectionPath: string; content: unknown; hasTarget: boolean; confirm: boolean; }

const defaultAddForm = { code: '', name: '', nameNative: '', isRtl: false };

// ─── Component ────────────────────────────────────────────────────────────────
const LanguageTranslationTab: React.FC = () => {
  const { currentLang, setLanguage: storeSetLanguage } = useI18nStore();
  const { addToast }     = useNotificationStore();
  const isZh             = currentLang === 'zh';

  const [allLanguages,   setAllLanguages]   = useState<Language[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [editingId,      setEditingId]      = useState<number | null>(null);
  const [editForm,       setEditForm]       = useState({ name: '', nameNative: '', isRtl: false, isActive: true });
  const [saving,         setSaving]         = useState(false);

  // Add form
  const [addForm,        setAddForm]        = useState(defaultAddForm);
  const [presetQuery,    setPresetQuery]    = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showAddForm,    setShowAddForm]    = useState(false);
  const [addSaving,      setAddSaving]      = useState(false);

  // Translation
  const [targetCode,     setTargetCode]     = useState('');
  const [includeUi,      setIncludeUi]      = useState(true);
  const [includeLocale,  setIncludeLocale]  = useState(true);
  const [sections,       setSections]       = useState<SectionEntry[]>([]);
  const [preflightDone,  setPreflightDone]  = useState(false);
  const [preflighting,   setPreflighting]   = useState(false);
  const [translating,    setTranslating]    = useState(false);
  const [progress,       setProgress]       = useState(0);
  const [log,            setLog]            = useState<LogItem[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Load all languages ──────────────────────────────────────────────────
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await languageApi.getAll();
      setAllLanguages(res.data.data);
    } catch { addToast(isZh ? '加载语言失败' : 'Failed to load languages', 'error'); }
    setLoading(false);
  }, [addToast, isZh]);

  useEffect(() => { reload(); }, [reload]);

  // Reset preflight when target changes
  useEffect(() => { setPreflightDone(false); setSections([]); setLog([]); setProgress(0); }, [targetCode]);

  // ─── Section 1: Set default language ────────────────────────────────────
  const handleSetDefault = useCallback(async (id: number) => {
    try {
      await languageApi.setDefault(id);
      addToast(isZh ? '默认语言已更新' : 'Default language updated', 'success');
      reload();
    } catch (e: any) {
      addToast(e.response?.data?.message || (isZh ? '操作失败' : 'Operation failed'), 'error');
    }
  }, [addToast, isZh, reload]);

  // ─── Section 2: Toggle active / save edit ────────────────────────────────
  const handleToggleActive = useCallback(async (lang: Language) => {
    if (lang.code === 'en') return;
    try {
      await languageApi.update(lang.id, { isActive: !lang.isActive });
      addToast(isZh ? '已更新' : 'Updated', 'success');
      reload();
    } catch (e: any) {
      addToast(e.response?.data?.message || (isZh ? '操作失败' : 'Failed'), 'error');
    }
  }, [addToast, isZh, reload]);

  const openEdit = (lang: Language) => {
    setEditingId(lang.id);
    setEditForm({ name: lang.name, nameNative: lang.nameNative, isRtl: lang.isRtl, isActive: lang.isActive });
  };

  const handleSaveEdit = useCallback(async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await languageApi.update(editingId, editForm);
      addToast(isZh ? '已保存' : 'Saved', 'success');
      setEditingId(null);
      reload();
    } catch (e: any) {
      addToast(e.response?.data?.message || (isZh ? '保存失败' : 'Save failed'), 'error');
    }
    setSaving(false);
  }, [editingId, editForm, addToast, isZh, reload]);

  // ─── Section 3: Add language ──────────────────────────────────────────────
  const selectPreset = (preset: typeof LANGUAGE_PRESETS[number]) => {
    setSelectedPreset(preset.code);
    setAddForm({ code: preset.code, name: preset.name, nameNative: preset.nameNative, isRtl: preset.isRtl });
    setShowAddForm(true);
  };

  const handleAddLanguage = useCallback(async () => {
    if (!addForm.code.trim() || !addForm.name.trim()) {
      addToast(isZh ? '语言代码和名称为必填项' : 'Code and name are required', 'error');
      return;
    }
    setAddSaving(true);
    try {
      await languageApi.create(addForm);
      addToast(isZh ? `已添加 ${addForm.name}（默认为停用状态，需翻译后再激活）` : `Added ${addForm.name}. Inactive by default — translate then activate.`, 'success');
      setAddForm(defaultAddForm);
      setSelectedPreset(null);
      setShowAddForm(false);
      setPresetQuery('');
      reload();
    } catch (e: any) {
      addToast(e.response?.data?.message || (isZh ? '添加失败' : 'Add failed'), 'error');
    }
    setAddSaving(false);
  }, [addForm, addToast, isZh, reload]);

  // ─── Section 4: Pre-flight check ─────────────────────────────────────────
  const runPreflight = useCallback(async () => {
    if (!targetCode) { addToast(isZh ? '请选择目标语言' : 'Select a target language', 'error'); return; }
    setPreflighting(true);
    try {
      const [enRes, targetRes] = await Promise.all([
        i18nApi.getSections('en'),
        i18nApi.getSections(targetCode),
      ]);
      const enSections    = enRes.data.data as { sectionPath: string; content: unknown }[];
      const targetPaths   = new Set((targetRes.data.data as { sectionPath: string }[]).map(s => s.sectionPath));

      setSections(enSections.map(s => ({
        sectionPath: s.sectionPath,
        content:     s.content,
        hasTarget:   targetPaths.has(s.sectionPath),
        confirm:     true,   // default: translate all (overwrite existing)
      })));
      setPreflightDone(true);
    } catch { addToast(isZh ? '预检失败' : 'Pre-flight check failed', 'error'); }
    setPreflighting(false);
  }, [targetCode, addToast, isZh]);

  // ─── Section 4: Run translation ───────────────────────────────────────────
  const runTranslation = useCallback(async () => {
    if (!targetCode) return;
    const targetLang = allLanguages.find(l => l.code === targetCode);
    const langName   = targetLang?.name || targetCode;
    const newLog: LogItem[] = [];

    const update = (items: LogItem[]) => {
      if (mountedRef.current) setLog([...items]);
    };

    setTranslating(true);
    setProgress(0);

    let completed = 0;
    const confirmedSections = sections.filter(s => s.confirm);
    const total = (includeUi ? 1 : 0) + (includeLocale ? confirmedSections.length : 0);
    if (total === 0) { setTranslating(false); return; }

    // Strip markdown fences from Kimi JSON response
    const clean = (s: string) => s.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');

    // ── UI strings ──────────────────────────────────────────────────────────
    if (includeUi) {
      const item: LogItem = { path: isZh ? 'UI 文字' : 'UI Strings', status: 'pending' };
      newLog.push(item);
      update(newLog);
      try {
        const enStrings = (await i18nApi.getUiStrings('en')).data.data as Record<string, string>;
        const entries   = Object.entries(enStrings);
        const batchSize = 50;

        for (let i = 0; i < entries.length; i += batchSize) {
          const batch = Object.fromEntries(entries.slice(i, i + batchSize));
          const res   = await kimiApi.chat({
            model:       'moonshot-v1-8k',
            temperature: 0.3,
            messages: [{
              role:    'user',
              content: `Translate all values of this JSON object from English to ${langName}. Keep all keys exactly unchanged. Return only valid JSON, no markdown, no explanation.\n\n${JSON.stringify(batch)}`,
            }],
          });
          const translated = JSON.parse(clean(res.data.choices[0].message.content));
          for (const [key, value] of Object.entries(translated)) {
            await i18nApi.saveUiString(key, targetCode, value as string);
          }
        }
        item.status = 'done';
      } catch (e: any) {
        item.status = 'error';
        addToast((isZh ? 'UI 文字翻译失败: ' : 'UI strings error: ') + e.message, 'error');
      }
      completed++;
      if (mountedRef.current) setProgress(Math.round((completed / total) * 100));
      update(newLog);
    }

    // ── Locale sections ─────────────────────────────────────────────────────
    if (includeLocale) {
      for (const section of confirmedSections) {
        const item: LogItem = { path: section.sectionPath, status: 'pending' };
        newLog.push(item);
        update(newLog);
        try {
          const res = await kimiApi.chat({
            model:       'moonshot-v1-8k',
            temperature: 0.3,
            messages: [{
              role:    'user',
              content: `Translate all text values in this JSON from English to ${langName}. Keep the structure and all keys identical. Return only valid JSON, no markdown, no explanation.\n\n${JSON.stringify(section.content)}`,
            }],
          });
          const translated = JSON.parse(clean(res.data.choices[0].message.content));
          await i18nApi.saveLocaleContent(targetCode, section.sectionPath, translated, 'kimi-translation');
          item.status = 'done';
        } catch (e: any) {
          item.status = 'error';
          addToast(`${section.sectionPath}: ${e.message}`, 'error');
        }
        completed++;
        if (mountedRef.current) setProgress(Math.round((completed / total) * 100));
        update(newLog);
      }
    }

    if (mountedRef.current) {
      setTranslating(false);
      setProgress(100);
      addToast(isZh ? `翻译完成 → ${langName}` : `Translation complete → ${langName}`, 'success');
    }
  }, [targetCode, allLanguages, sections, includeUi, includeLocale, addToast, isZh]);

  // ─── Filtered presets ─────────────────────────────────────────────────────
  const existingCodes  = new Set(allLanguages.map(l => l.code));
  const filteredPresets = LANGUAGE_PRESETS.filter(p =>
    !existingCodes.has(p.code) &&
    (!presetQuery || p.name.toLowerCase().includes(presetQuery.toLowerCase()) ||
     p.nameNative.toLowerCase().includes(presetQuery.toLowerCase()) ||
     p.code.toLowerCase().includes(presetQuery.toLowerCase()))
  );

  const nonEnActive = allLanguages.filter(l => l.code !== 'en' && l.isActive);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, fontSize: 13, color: 'var(--text-muted)' }}>
      {isZh ? '加载中…' : 'Loading…'}
    </div>
  );

  return (
    <div>

      {/* ── 1. LANGUAGE SETTINGS ─────────────────────────────────────────── */}
      <div style={card}>
        <SectionHeading color="var(--accent)">{isZh ? '语言设置' : 'Language Settings'}</SectionHeading>
        <div style={{ maxWidth: 320 }}>
          <label style={label}>{isZh ? '默认语言' : 'Default Language'}</label>
          <select
            style={select}
            value={allLanguages.find(l => l.isDefault)?.id ?? ''}
            onChange={(e) => handleSetDefault(Number(e.target.value))}
          >
            {allLanguages.filter(l => l.isActive).map(l => (
              <option key={l.id} value={l.id}>
                {l.nameNative} ({l.code.toUpperCase()})
                {l.isDefault ? (isZh ? ' — 当前默认' : ' — current default') : ''}
              </option>
            ))}
          </select>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
            {isZh ? '新用户首次访问时将看到此语言。' : 'First-time visitors see this language. Users can always switch via the dropdown.'}
          </div>
        </div>
      </div>

      {/* ── 2. ACTIVE LANGUAGES TABLE ────────────────────────────────────── */}
      <div style={card}>
        <SectionHeading color="var(--blue)">{isZh ? '语言管理' : 'Active Languages'}</SectionHeading>
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 120px 50px 80px 90px', gap: 8, padding: '8px 12px', background: 'var(--bg-overlay)', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            <span>{isZh ? '语言' : 'Language'}</span>
            <span>{isZh ? '代码' : 'Code'}</span>
            <span>{isZh ? '本地名称' : 'Native Name'}</span>
            <span>RTL</span>
            <span>{isZh ? '状态' : 'Status'}</span>
            <span>{isZh ? '操作' : 'Actions'}</span>
          </div>

          {allLanguages.map(lang => (
            <React.Fragment key={lang.id}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 120px 50px 80px 90px', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{lang.name}</span>
                  {lang.isDefault && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(63,185,80,0.3)' }}>{isZh ? '默认' : 'DEFAULT'}</span>}
                </div>
                <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: 'var(--text-secondary)' }}>{lang.code.toUpperCase()}</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{lang.nameNative}</span>
                <span style={{ fontSize: 12 }}>{lang.isRtl ? <span style={{ color: 'var(--orange)' }}>RTL</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</span>
                <span>
                  {lang.code === 'en' ? (
                    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: 'var(--bg-overlay)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{isZh ? '受保护' : 'Protected'}</span>
                  ) : (
                    <button
                      onClick={() => handleToggleActive(lang)}
                      style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, cursor: 'pointer', border: 'none', fontWeight: 600, background: lang.isActive ? 'rgba(16,185,129,0.15)' : 'var(--bg-overlay)', color: lang.isActive ? 'var(--accent)' : 'var(--text-muted)' }}
                    >
                      {lang.isActive ? (isZh ? '已激活' : 'Active') : (isZh ? '已停用' : 'Inactive')}
                    </button>
                  )}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => editingId === lang.id ? setEditingId(null) : openEdit(lang)}
                    style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'none', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer' }}
                  >
                    {editingId === lang.id ? (isZh ? '取消' : 'Cancel') : (isZh ? '编辑' : 'Edit')}
                  </button>
                </div>
              </div>

              {/* Inline edit row */}
              {editingId === lang.id && (
                <div style={{ padding: '12px 14px', background: 'var(--bg-overlay)', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 10, alignItems: 'flex-end' }}>
                  <div>
                    <label style={label}>{isZh ? '英文名称' : 'English Name'}</label>
                    <input style={input} value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <label style={label}>{isZh ? '本地名称' : 'Native Name'}</label>
                    <input style={input} value={editForm.nameNative} onChange={e => setEditForm(p => ({ ...p, nameNative: e.target.value }))} />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', paddingBottom: 2 }}>
                    <input type="checkbox" checked={editForm.isRtl} onChange={e => setEditForm(p => ({ ...p, isRtl: e.target.checked }))} />
                    RTL
                  </label>
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
                  >
                    {saving ? '…' : (isZh ? '保存' : 'Save')}
                  </button>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── 3. ADD LANGUAGE ──────────────────────────────────────────────── */}
      <div style={card}>
        <SectionHeading color="var(--purple)">{isZh ? '添加语言' : 'Add Language'}</SectionHeading>

        {/* Preset search */}
        <div style={{ marginBottom: 12, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}><Icons.search size={13} /></span>
          <input
            style={{ ...input, paddingLeft: 32 }}
            value={presetQuery}
            onChange={e => setPresetQuery(e.target.value)}
            placeholder={isZh ? '搜索语言…' : 'Search languages…'}
          />
        </div>

        {/* Preset grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 6, maxHeight: 240, overflowY: 'auto', marginBottom: 14 }}>
          {filteredPresets.map(preset => (
            <button
              key={preset.code}
              onClick={() => selectPreset(preset)}
              style={{
                padding: '8px 10px', borderRadius: 'var(--radius-sm)', textAlign: 'left', cursor: 'pointer',
                border: selectedPreset === preset.code ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: selectedPreset === preset.code ? 'var(--accent-dim)' : 'var(--bg-overlay)',
                transition: 'all var(--transition)',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: selectedPreset === preset.code ? 'var(--accent)' : 'var(--text-primary)', marginBottom: 2 }}>{preset.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{preset.nameNative}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 4 }}>
                <span style={{ fontFamily: "'DM Mono', monospace" }}>{preset.code.toUpperCase()}</span>
                {preset.isRtl && <span style={{ color: 'var(--orange)' }}>RTL</span>}
              </div>
            </button>
          ))}
          {filteredPresets.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '16px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              {isZh ? '未找到语言。使用下方自定义表单手动输入。' : 'Language not found. Use the form below to enter it manually.'}
            </div>
          )}
        </div>

        {/* Custom entry toggle */}
        <button
          onClick={() => { setShowAddForm(!showAddForm); if (!showAddForm) setSelectedPreset(null); }}
          style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: showAddForm ? 12 : 0, textDecoration: 'underline' }}
        >
          {showAddForm ? (isZh ? '收起' : 'Collapse') : (isZh ? '不在列表中？手动输入' : 'Not in list? Enter manually')}
        </button>

        {/* Add form — shown after preset selection or manual toggle */}
        {showAddForm && (
          <div style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '14px 14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={label}>{isZh ? 'ISO 代码' : 'ISO Code'}</label>
                <input style={input} value={addForm.code} onChange={e => setAddForm(p => ({ ...p, code: e.target.value.toLowerCase() }))} placeholder="e.g. fr" maxLength={8} />
              </div>
              <div>
                <label style={label}>{isZh ? '英文名称' : 'English Name'}</label>
                <input style={input} value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. French" />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={label}>{isZh ? '本地名称（自动填写）' : 'Native Name (auto-filled)'}</label>
              <input style={input} value={addForm.nameNative} onChange={e => setAddForm(p => ({ ...p, nameNative: e.target.value }))} placeholder="e.g. Français" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" checked={addForm.isRtl} onChange={e => setAddForm(p => ({ ...p, isRtl: e.target.checked }))} />
                {isZh ? '从右到左（RTL）语言' : 'Right-to-left (RTL) language'}
              </label>
              <button
                onClick={handleAddLanguage}
                disabled={addSaving || !addForm.code.trim() || !addForm.name.trim()}
                style={{ padding: '8px 18px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', fontSize: 13, fontWeight: 600, cursor: addSaving || !addForm.code.trim() ? 'not-allowed' : 'pointer', opacity: addSaving || !addForm.code.trim() ? 0.6 : 1 }}
              >
                {addSaving ? '…' : (isZh ? '添加语言' : 'Add Language')}
              </button>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>
              {isZh ? '新语言默认为停用状态。翻译完成后，在上方语言管理表格中激活它。' : 'New languages start as inactive. After translating in Section 4 below, activate it in the table above.'}
            </div>
          </div>
        )}
      </div>

      {/* ── 4. KIMI TRANSLATION ──────────────────────────────────────────── */}
      <div style={card}>
        <SectionHeading color="var(--cyan)">{isZh ? 'Kimi 全站翻译' : 'Kimi Full-Site Translation'}</SectionHeading>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={label}>{isZh ? '源语言' : 'Source Language'}</label>
            <div style={{ ...input, color: 'var(--text-muted)', background: 'var(--bg-overlay)' }}>English (EN)</div>
          </div>
          <div>
            <label style={label}>{isZh ? '目标语言' : 'Target Language'}</label>
            <select style={select} value={targetCode} onChange={e => setTargetCode(e.target.value)}>
              <option value="">{isZh ? '请选择…' : 'Select a language…'}</option>
              {allLanguages.filter(l => l.code !== 'en').map(l => (
                <option key={l.code} value={l.code}>
                  {l.nameNative} ({l.code.toUpperCase()}) {!l.isActive ? (isZh ? '（未激活）' : '(inactive)') : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Scope */}
        <div style={{ marginBottom: 14 }}>
          <label style={label}>{isZh ? '翻译范围' : 'Translation Scope'}</label>
          <div style={{ display: 'flex', gap: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={includeUi} onChange={e => setIncludeUi(e.target.checked)} />
              {isZh ? 'UI 文字（导航、按钮标签等）' : 'UI Strings (navigation, button labels, etc.)'}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={includeLocale} onChange={e => setIncludeLocale(e.target.checked)} />
              {isZh ? '本地化内容（团队数据、概览内容）' : 'Locale Content (team data, overview content)'}
            </label>
          </div>
        </div>

        {/* Pre-flight button */}
        {!preflightDone && !translating && (
          <button
            onClick={runPreflight}
            disabled={preflighting || !targetCode || (!includeUi && !includeLocale)}
            style={{ padding: '9px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: preflighting || !targetCode ? 'not-allowed' : 'pointer', opacity: preflighting || !targetCode ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {preflighting ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>↻</span> {isZh ? '检查中…' : 'Checking…'}</> : (isZh ? '检查现有内容' : 'Check Existing Content')}
          </button>
        )}

        {/* Preflight results */}
        {preflightDone && !translating && (
          <div>
            {includeLocale && sections.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                  {isZh ? `本地化内容：共 ${sections.length} 个区块` : `Locale Content: ${sections.length} sections found`}
                  {sections.filter(s => s.hasTarget).length > 0 && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--orange)', fontWeight: 400 }}>
                      {sections.filter(s => s.hasTarget).length} {isZh ? '个已有翻译（将覆盖）' : 'already have translations (will overwrite if checked)'}
                    </span>
                  )}
                </div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', maxHeight: 200, overflowY: 'auto' }}>
                  {sections.map((s, i) => (
                    <label key={s.sectionPath} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', borderBottom: i < sections.length - 1 ? '1px solid var(--border-subtle)' : 'none', cursor: 'pointer' }}>
                      <input type="checkbox" checked={s.confirm} onChange={e => setSections(prev => prev.map((p, pi) => pi === i ? { ...p, confirm: e.target.checked } : p))} />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1, fontFamily: "'DM Mono', monospace" }}>{s.sectionPath}</span>
                      {s.hasTarget && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(245,158,11,0.1)', color: 'var(--orange)', border: '1px solid rgba(245,158,11,0.3)' }}>{isZh ? '已存在' : 'Exists'}</span>}
                    </label>
                  ))}
                </div>
                <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                  <button onClick={() => setSections(p => p.map(s => ({ ...s, confirm: true  })))} style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{isZh ? '全选' : 'Select all'}</button>
                  <button onClick={() => setSections(p => p.map(s => ({ ...s, confirm: false })))} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{isZh ? '取消全选' : 'Deselect all'}</button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                onClick={runTranslation}
                disabled={!includeUi && sections.filter(s => s.confirm).length === 0}
                style={{ padding: '10px 20px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Icons.robot size={14} />
                {isZh ? '开始翻译' : 'Start Translation'}
              </button>
              <button onClick={() => { setPreflightDone(false); setSections([]); }} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {isZh ? '重新检查' : 'Re-check'}
              </button>
            </div>
          </div>
        )}

        {/* Translation progress */}
        {(translating || (log.length > 0 && !translating)) && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                {translating ? (isZh ? '翻译中…' : 'Translating…') : (isZh ? '翻译完成' : 'Translation complete')}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{progress}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--bg-overlay)', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', borderRadius: 3, transition: 'width 0.3s ease' }} />
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', maxHeight: 180, overflowY: 'auto' }}>
              {log.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderBottom: i < log.length - 1 ? '1px solid var(--border-subtle)' : 'none', fontSize: 12 }}>
                  <span style={{ flexShrink: 0, color: item.status === 'done' ? 'var(--accent)' : item.status === 'error' ? 'var(--red)' : 'var(--text-muted)' }}>
                    {item.status === 'done' ? '✓' : item.status === 'error' ? '✗' : '…'}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: "'DM Mono', monospace", flex: 1 }}>{item.path}</span>
                  {item.status === 'error' && <span style={{ fontSize: 11, color: 'var(--red)' }}>{isZh ? '失败' : 'failed'}</span>}
                </div>
              ))}
            </div>
            {!translating && (
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                {isZh
                  ? '翻译完成后，请前往上方语言管理表格激活该语言，使其对用户可见。'
                  : 'Translation done. Go to the language table above and activate the language to make it visible to users.'}
              </div>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <div style={{ marginTop: 14, padding: '8px 12px', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-sm)', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {isZh
            ? 'AI 翻译仅供参考。建议在激活语言前，由母语用户审阅翻译内容。'
            : 'AI translation is a starting point. Review output with a native speaker before activating the language for users.'}
        </div>
      </div>

    </div>
  );
};

export default React.memo(LanguageTranslationTab);
