import React, {
  useState, useEffect, useRef, useCallback, useImperativeHandle,
} from 'react';
import { useAuthStore }         from '@/stores/useAuthStore';
import { useI18nStore }         from '@/stores/useI18nStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { i18nApi, teamApi, userApi } from '@/utils/api';
import { Icons }                from '@/components/icons';
import type { Team, User }      from '@/types';

// ─── Section paths ────────────────────────────────────────────────────────────
const PATH_EXEC  = 'sections.executive_summary';
const PATH_TL    = 'sections.timeline';
const PATH_RESP  = 'sections.responsibility';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ExecSummary { title: string; intro: string; specs: string[]; features: string[]; }

// Status values: ALWAYS stored in English. Displayed via t() for any language.
const MILESTONE_STATUSES = ['Planned', 'In Progress', 'Completed', 'Delayed', 'On Hold'] as const;
type MilestoneStatus = typeof MILESTONE_STATUSES[number];
const statusKey = (s: string) => `status_${s.toLowerCase().replace(/\s+/g, '_')}`;

const DATE_TYPES = ['Start Date', 'End Date'] as const;
type DateType = typeof DATE_TYPES[number];

const CARD_BORDER: Record<string, string> = {
  'Planned':     'var(--blue)',
  'In Progress': 'var(--accent)',
  'Completed':   '#059669',
  'Delayed':     'var(--red)',
  'On Hold':     'var(--orange)',
};

interface MilestoneItem { id: string; title: string; dateType: DateType; date: string; status: MilestoneStatus; }
interface MilestoneGroup { id: string; name: string; items: MilestoneItem[]; }
interface ResponsibilityRow { id: string; teamId: string; teamName: string; ownerId: number | null; ownerName: string; mainScope: string; }

// ─── Helpers ─────────────────────────────────────────────────────────────────
const genId        = () => `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
const defaultExec: ExecSummary = { title: '', intro: '', specs: [], features: [] };

// ─── Styles ───────────────────────────────────────────────────────────────────
const cardSt: React.CSSProperties = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 20px', marginBottom: 14 };
const labelSt: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 4, display: 'block' };
const inputSt: React.CSSProperties = { width: '100%', padding: '8px 11px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const selectSt: React.CSSProperties = { ...inputSt, cursor: 'pointer' };
const btnSm = (color = 'var(--text-secondary)'): React.CSSProperties => ({ padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'none', color, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 });
const iconBtn = (color = 'var(--text-muted)', disabled = false): React.CSSProperties => ({ width: 26, height: 26, border: '1px solid var(--border)', borderRadius: 5, background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: disabled ? 'not-allowed' : 'pointer', color, opacity: disabled ? 0.3 : 1, flexShrink: 0 });

function SectionHeading({ color, label }: { color: string; label: string }) {
  return (
    <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
      <span style={{ width: 3, height: 14, background: color, borderRadius: 2, flexShrink: 0 }} />
      {label}
    </h3>
  );
}

export interface DashboardSettingsTabHandle { save: () => void; reset: () => void; hasChanges: boolean; saving: boolean; }

const DashboardSettingsTab = React.forwardRef<
  DashboardSettingsTabHandle,
  { onStateChange?: (hasChanges: boolean, saving: boolean) => void }
>(({ onStateChange }, ref) => {
  const { user }     = useAuthStore();
  const { t }        = useI18nStore();
  const { addToast } = useNotificationStore();
  const updatedBy    = (user as any)?.username || 'admin';

  const [execSummary,    setExecSummary]    = useState<ExecSummary>(defaultExec);
  const [groups,         setGroups]         = useState<MilestoneGroup[]>([]);
  const [responsibility, setResponsibility] = useState<ResponsibilityRow[]>([]);
  const [teams,          setTeams]          = useState<Team[]>([]);
  const [users,          setUsers]          = useState<User[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [hasChanges,     setHasChanges]     = useState(false);
  const [newSpec,        setNewSpec]        = useState('');
  const newSpecRef = useRef<HTMLInputElement>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const toggleGroup = (id: string) =>
    setCollapsedGroups(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  useEffect(() => { onStateChange?.(hasChanges, saving); }, [hasChanges, saving, onStateChange]);

  const loadFromDB = useCallback(async () => {
    setLoading(true);
    const [execR, tlR, respR, teamsR, usersR] = await Promise.allSettled([
      i18nApi.getLocaleSection('en', PATH_EXEC),
      i18nApi.getLocaleSection('en', PATH_TL),
      i18nApi.getLocaleSection('en', PATH_RESP),
      teamApi.getAll(), userApi.getAll(),
    ]);
    if (execR.status === 'fulfilled' && execR.value.data?.data) {
      const d = execR.value.data.data as any;
      setExecSummary({ title: d.title ?? '', intro: d.intro ?? '', specs: Array.isArray(d.specs) ? d.specs : [], features: Array.isArray(d.features) ? d.features : [] });
    }
    if (tlR.status === 'fulfilled' && tlR.value.data?.data) {
      const data = tlR.value.data.data as any;
      let loadedGroups: MilestoneGroup[] = [];
      if (Array.isArray(data.groups)) {
        loadedGroups = data.groups;
      } else if (Array.isArray(data.items) && data.items.length > 0) {
        loadedGroups = [{ id: genId(), name: 'Milestones', items: data.items.map((item: any) => ({ id: item.id || genId(), title: item.title || '', dateType: item.dateType || 'Start Date', date: item.date || '', status: item.status || 'Planned' })) }];
      }
      setGroups(loadedGroups);
      setCollapsedGroups(new Set(loadedGroups.map(g => g.id)));
    }
    if (respR.status === 'fulfilled' && Array.isArray((respR.value.data?.data as any)?.rows)) setResponsibility((respR.value.data.data as any).rows);
    if (teamsR.status === 'fulfilled') setTeams(teamsR.value.data.data ?? []);
    if (usersR.status === 'fulfilled') setUsers(usersR.value.data.data ?? []);
    setLoading(false);
    setHasChanges(false);
  }, []);

  useEffect(() => { loadFromDB(); }, [loadFromDB]);

  const markChanged = () => setHasChanges(true);
  const updateExec  = <K extends keyof ExecSummary>(key: K, val: ExecSummary[K]) => { setExecSummary(prev => ({ ...prev, [key]: val })); markChanged(); };
  const addSpec     = () => { const v = newSpec.trim(); if (!v) return; updateExec('specs', [...execSummary.specs, v]); setNewSpec(''); newSpecRef.current?.focus(); };
  const removeSpec  = (i: number) => updateExec('specs', execSummary.specs.filter((_, idx) => idx !== i));
  const addFeature  = () => { updateExec('features', [...execSummary.features, '']); };
  const updateFeature = (i: number, val: string) => { const copy = [...execSummary.features]; copy[i] = val; updateExec('features', copy); };
  const removeFeature = (i: number) => updateExec('features', execSummary.features.filter((_, idx) => idx !== i));

  const addGroup = () => { const newId = genId(); setGroups(prev => [...prev, { id: newId, name: '', items: [] }]); setCollapsedGroups(prev => new Set(prev).add(newId)); markChanged(); };
  const updateGroupName = (gi: number, name: string) => { setGroups(prev => prev.map((g, idx) => idx === gi ? { ...g, name } : g)); markChanged(); };
  const removeGroup = (gi: number) => { if (!window.confirm(t('dt_remove_group_confirm', 'Remove this group and all its milestones?'))) return; setGroups(prev => prev.filter((_, idx) => idx !== gi)); markChanged(); };
  const moveGroup   = (gi: number, dir: -1 | 1) => { const copy = [...groups]; const j = gi + dir; if (j < 0 || j >= copy.length) return; [copy[gi], copy[j]] = [copy[j], copy[gi]]; setGroups(copy); markChanged(); };

  const addMilestone    = (gi: number) => { setGroups(prev => prev.map((g, idx) => idx !== gi ? g : { ...g, items: [...g.items, { id: genId(), title: '', dateType: 'Start Date', date: '', status: 'Planned' }] })); markChanged(); };
  const updateMilestone = (gi: number, ii: number, patch: Partial<MilestoneItem>) => { setGroups(prev => prev.map((g, gIdx) => gIdx !== gi ? g : { ...g, items: g.items.map((item, iIdx) => iIdx !== ii ? item : { ...item, ...patch }) })); markChanged(); };
  const removeMilestone = (gi: number, ii: number) => { setGroups(prev => prev.map((g, gIdx) => gIdx !== gi ? g : { ...g, items: g.items.filter((_, iIdx) => iIdx !== ii) })); markChanged(); };
  const moveMilestone   = (gi: number, ii: number, dir: -1 | 1) => { const j = ii + dir; const group = groups[gi]; if (!group || j < 0 || j >= group.items.length) return; const copy = [...group.items]; [copy[ii], copy[j]] = [copy[j], copy[ii]]; setGroups(prev => prev.map((g, gIdx) => gIdx !== gi ? g : { ...g, items: copy })); markChanged(); };

  const addRow    = () => { setResponsibility(prev => [...prev, { id: genId(), teamId: '', teamName: '', ownerId: null, ownerName: '', mainScope: '' }]); markChanged(); };
  const updateRow = (i: number, patch: Partial<ResponsibilityRow>) => { setResponsibility(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r)); markChanged(); };
  const removeRow = (i: number) => { setResponsibility(prev => prev.filter((_, idx) => idx !== i)); markChanged(); };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await Promise.all([
        i18nApi.saveLocaleContent('en', PATH_EXEC, execSummary as any, updatedBy),
        i18nApi.saveLocaleContent('en', PATH_TL,   { groups }          as any, updatedBy),
        i18nApi.saveLocaleContent('en', PATH_RESP,  { rows: responsibility } as any, updatedBy),
      ]);
      useI18nStore.getState().loadLocale();
      addToast(t('dt_save_success', 'Dashboard settings saved'), 'success');
      setHasChanges(false);
    } catch (e: any) {
      addToast(t('dt_save_fail', 'Save failed') + ': ' + (e?.response?.data?.message || e?.message || 'error'), 'error');
    }
    setSaving(false);
  }, [execSummary, groups, responsibility, updatedBy, addToast, t]);

  const handleReset = useCallback(() => {
    if (!window.confirm(t('dt_discard_confirm', 'Discard all unsaved changes and reload from database?'))) return;
    loadFromDB();
  }, [loadFromDB, t]);

  useImperativeHandle(ref, () => ({
    save: handleSave, reset: handleReset,
    get hasChanges() { return hasChanges; },
    get saving()     { return saving; },
  }), [handleSave, handleReset, hasChanges, saving]);

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, fontSize: 13, color: 'var(--text-muted)' }}>{t('lt_loading', 'Loading…')}</div>;
  }

  return (
    <div>
      {/* ── 1. EXECUTIVE SUMMARY ────────────────────────────────────────────── */}
      <div style={cardSt}>
        <SectionHeading color="var(--accent)" label={t('dt_exec_summary', 'Executive Summary')} />
        <div style={{ marginBottom: 14 }}>
          <label style={labelSt}>{t('dt_section_title_label', 'Section Title')}</label>
          <input style={inputSt} value={execSummary.title} onChange={e => updateExec('title', e.target.value)} placeholder={t('dt_title_ph', 'e.g. Product Overview')} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelSt}>{t('dt_intro_text', 'Intro Text')}</label>
          <textarea value={execSummary.intro} onChange={e => updateExec('intro', e.target.value)} placeholder={t('dt_intro_ph', 'Brief introduction…')} rows={4} style={{ ...inputSt, minHeight: 80, resize: 'vertical', lineHeight: 1.55, fontFamily: 'inherit' }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelSt}>{t('dt_specs_badges', 'Specs Badges')}</label>
          {execSummary.specs.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {execSummary.specs.map((spec, i) => (
                <span key={i} style={{ padding: '4px 10px', borderRadius: 99, fontSize: 12, background: 'var(--bg-overlay)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                  {spec}
                  <button onClick={() => removeSpec(i)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><Icons.close size={11} /></button>
                </span>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <input ref={newSpecRef} value={newSpec} onChange={e => setNewSpec(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSpec(); } }} placeholder={t('dt_spec_ph', 'e.g. 5.5in TFT — press Enter')} style={{ ...inputSt, flex: 1 }} />
            <button onClick={addSpec} disabled={!newSpec.trim()} style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--accent)', color: 'var(--text-inverse)', fontSize: 12, fontWeight: 600, cursor: newSpec.trim() ? 'pointer' : 'not-allowed', opacity: newSpec.trim() ? 1 : 0.5, flexShrink: 0 }}>{t('btn_add', 'Add')}</button>
          </div>
        </div>
        <div>
          <label style={labelSt}>{t('dt_feature_list', 'Feature List')}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            {execSummary.features.map((feat, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: 'var(--accent)', flexShrink: 0 }}>•</span>
                <input value={feat} onChange={e => updateFeature(i, e.target.value)} placeholder={t('dt_feat_ph', 'Feature description')} style={{ ...inputSt, flex: 1 }} />
                <button onClick={() => removeFeature(i)} style={btnSm('var(--red)')}><Icons.close size={12} /></button>
              </div>
            ))}
          </div>
          <button onClick={addFeature} style={btnSm('var(--accent)')}><Icons.plus size={13} /> {t('dt_add_feature', 'Add Feature')}</button>
        </div>
      </div>

      {/* ── 2. TIMELINE / MILESTONES ─────────────────────────────────────────── */}
      <div style={cardSt}>
        <SectionHeading color="var(--blue)" label={t('dt_timeline_title', 'Timeline / Milestones')} />
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.6 }}>
          {t('dt_timeline_hint', 'Each group becomes one kanban column on the Overview. Groups and milestones display in the order set here.')}
        </div>

        {groups.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, background: 'var(--bg-overlay)', borderRadius: 'var(--radius-sm)', marginBottom: 12, border: '1px solid var(--border)' }}>
            {t('dt_no_groups', 'No groups yet. Add the first group below.')}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
          {groups.map((group, gi) => (
            <div key={group.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', background: 'var(--bg-overlay)' }}>
              {/* Group header — click to collapse/expand */}
              <div
                style={{ padding: '10px 14px', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', gap: 8, borderBottom: collapsedGroups.has(group.id) ? 'none' : '1px solid var(--border-subtle)', cursor: 'pointer', userSelect: 'none' }}
                onClick={e => { const tag = (e.target as HTMLElement).tagName; if (tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'BUTTON' && !(e.target as HTMLElement).closest('button')) toggleGroup(group.id); }}
              >
                <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, transition: 'transform 0.2s ease', transform: collapsedGroups.has(group.id) ? 'rotate(-90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▼</span>
                <input value={group.name} onChange={e => updateGroupName(gi, e.target.value)} placeholder={t('dt_group_name_ph', 'Group name  e.g. Q1 2026 or Phase 1')} onClick={e => e.stopPropagation()} style={{ ...inputSt, flex: 1, fontWeight: 700, fontSize: 13, background: 'transparent', border: '1px solid var(--border)' }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                  {group.items.length} {group.items.length === 1 ? t('dt_milestone_count', 'milestone') : t('dt_milestones_count', 'milestones')}
                </span>
                <div style={{ display: 'flex', gap: 3 }} onClick={e => e.stopPropagation()}>
                  <button onClick={e => { e.stopPropagation(); moveGroup(gi, -1); }} disabled={gi === 0}               title={t('dt_move_group_up', 'Move group up')}   style={iconBtn('var(--text-muted)', gi === 0)}>↑</button>
                  <button onClick={e => { e.stopPropagation(); moveGroup(gi, 1); }}  disabled={gi === groups.length - 1} title={t('dt_move_group_down', 'Move group down')} style={iconBtn('var(--text-muted)', gi === groups.length - 1)}>↓</button>
                  <button onClick={e => { e.stopPropagation(); removeGroup(gi); }}   title={t('dt_delete_group', 'Delete group')}               style={iconBtn('var(--red)')}><Icons.close size={11} /></button>
                </div>
              </div>

              {/* Milestone cards — hidden when collapsed */}
              <div style={{ display: collapsedGroups.has(group.id) ? 'none' : 'flex', padding: '10px 12px', flexDirection: 'column', gap: 8 }}>
                {group.items.length === 0 && (
                  <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                    {t('dt_no_milestones', 'No milestones yet. Add the first one below.')}
                  </div>
                )}
                {group.items.map((item, ii) => (
                  <div key={item.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: `3px solid ${CARD_BORDER[item.status] || 'var(--blue)'}`, borderRadius: 'var(--radius-sm)', padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input value={item.title} onChange={e => updateMilestone(gi, ii, { title: e.target.value })} placeholder={t('dt_milestone_title_ph', 'Milestone title')} style={{ ...inputSt, fontWeight: 600 }} />
                      <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 1fr', gap: 8 }}>
                        <div>
                          <label style={{ ...labelSt, marginBottom: 3 }}>{t('dt_date_label_col', 'Date Label')}</label>
                          <select value={item.dateType} onChange={e => updateMilestone(gi, ii, { dateType: e.target.value as DateType })} style={{ ...selectSt, fontSize: 12 }}>
                            <option value="Start Date">{t('milestone_start_date', 'Start Date')}</option>
                            <option value="End Date">{t('milestone_end_date', 'End Date')}</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ ...labelSt, marginBottom: 3 }}>{t('dt_date_col', 'Date')}</label>
                          <input type="date" value={item.date} onChange={e => updateMilestone(gi, ii, { date: e.target.value })} style={{ ...inputSt, fontSize: 12 }} />
                        </div>
                        <div>
                          <label style={{ ...labelSt, marginBottom: 3 }}>{t('dt_status_col', 'Status')}</label>
                          <select value={item.status} onChange={e => updateMilestone(gi, ii, { status: e.target.value as MilestoneStatus })} style={{ ...selectSt, fontSize: 12, color: CARD_BORDER[item.status] || 'var(--text-secondary)', fontWeight: 600 }}>
                            {MILESTONE_STATUSES.map(s => (
                              <option key={s} value={s}>{t(statusKey(s), s)}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 2 }}>
                      <button onClick={() => moveMilestone(gi, ii, -1)} disabled={ii === 0}                    title={t('btn_move_up', '↑')}   style={iconBtn('var(--text-muted)', ii === 0)}>↑</button>
                      <button onClick={() => moveMilestone(gi, ii, 1)}  disabled={ii === group.items.length - 1} title={t('btn_move_down', '↓')} style={iconBtn('var(--text-muted)', ii === group.items.length - 1)}>↓</button>
                      <button onClick={() => removeMilestone(gi, ii)}                                          title={t('btn_remove', 'Remove')} style={iconBtn('var(--red)')}><Icons.close size={11} /></button>
                    </div>
                  </div>
                ))}
                <button onClick={() => addMilestone(gi)} style={{ padding: '7px 12px', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border)', background: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center' }}>
                  <Icons.plus size={12} /> {t('dt_add_milestone', 'Add Milestone')}
                </button>
              </div>
            </div>
          ))}
        </div>

        <button onClick={addGroup} style={btnSm('var(--blue)')}><Icons.plus size={13} /> {t('dt_add_group', 'Add Group')}</button>

        {/* Status legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 14 }}>
          {MILESTONE_STATUSES.map(s => (
            <span key={s} style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: CARD_BORDER[s], flexShrink: 0 }} />
              {t(statusKey(s), s)}
            </span>
          ))}
        </div>
      </div>

      {/* ── 3. RESPONSIBILITY MATRIX ──────────────────────────────────────────── */}
      <div style={cardSt}>
        <SectionHeading color="var(--purple)" label={t('dt_resp_matrix', 'Responsibility Matrix')} />
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
          {t('dt_resp_desc', 'Each row maps a team and owner to a scope of work. The same team can appear in multiple rows.')}
        </div>
        {responsibility.length > 0 ? (
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 36px', gap: 8, padding: '8px 12px', background: 'var(--bg-overlay)', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              <span>{t('dt_resp_team_col', 'Team')}</span>
              <span>{t('dt_resp_owner_col', 'Owner / Leader')}</span>
              <span>{t('dt_resp_scope_col', 'Main Scope')}</span>
              <span></span>
            </div>
            {responsibility.map((row, i) => (
              <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 36px', gap: 8, padding: '8px 12px', borderBottom: i < responsibility.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center' }}>
                <select value={row.teamId} onChange={e => { const team = teams.find(t => t.teamId === e.target.value); updateRow(i, { teamId: e.target.value, teamName: team?.nameEn || e.target.value }); }} style={{ ...selectSt, padding: '6px 9px', fontSize: 12 }}>
                  <option value="">{t('dt_select_team_ph', 'Select team…')}</option>
                  {teams.map(team => <option key={team.teamId} value={team.teamId}>{team.nameEn}</option>)}
                </select>
                <select value={row.ownerId ?? ''} onChange={e => { const u = users.find(u => u.id === Number(e.target.value)); updateRow(i, { ownerId: u?.id ?? null, ownerName: u?.firstName || '' }); }} style={{ ...selectSt, padding: '6px 9px', fontSize: 12 }}>
                  <option value="">{t('dt_select_owner_ph', 'Select owner…')}</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.firstName}</option>)}
                </select>
                <input value={row.mainScope} onChange={e => updateRow(i, { mainScope: e.target.value })} placeholder={t('dt_resp_scope_col', 'Main Scope')} style={{ ...inputSt, padding: '6px 9px', fontSize: 12 }} />
                <button onClick={() => removeRow(i)} style={{ width: 28, height: 28, border: '1px solid var(--red)', borderRadius: 4, background: 'none', cursor: 'pointer', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icons.close size={12} /></button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, background: 'var(--bg-overlay)', borderRadius: 'var(--radius-sm)', marginBottom: 10, border: '1px solid var(--border)' }}>
            {t('dt_no_rows', 'No rows yet.')}
          </div>
        )}
        <button onClick={addRow} style={btnSm('var(--purple)')}><Icons.plus size={13} /> {t('dt_add_row', 'Add Row')}</button>
        {teams.length === 0 && <div style={{ marginTop: 10, fontSize: 11, color: 'var(--orange)', display: 'flex', alignItems: 'center', gap: 6 }}><Icons.info size={13} /> {t('dt_no_teams_warn', 'No teams yet — add teams in Admin Setup > Teams.')}</div>}
        {users.length === 0 && <div style={{ marginTop: 6,  fontSize: 11, color: 'var(--orange)', display: 'flex', alignItems: 'center', gap: 6 }}><Icons.info size={13} /> {t('dt_no_users_warn', 'No users yet — add users in Admin Setup > Users.')}</div>}
      </div>
    </div>
  );
});

DashboardSettingsTab.displayName = 'DashboardSettingsTab';
export default DashboardSettingsTab;
