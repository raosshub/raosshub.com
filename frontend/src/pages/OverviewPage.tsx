import React, { useMemo, useState } from 'react';
import { useI18nStore }  from '@/stores/useI18nStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useConfigStore } from '@/stores/useConfigStore';
import { Icons }          from '@/components/icons';
import ModelViewer         from '@/components/ModelViewer';
import { getStatusLabel }  from '@/types';

// ─── Project status colours ───────────────────────────────────────────────────
const PROJECT_STATUS_COLORS: Record<string, string> = {
  planning:    '#6b7280',
  development: '#3b82f6',
  prototype:   '#f59e0b',
  production:  '#10b981',
  maintenance: '#8b5cf6',
  completed:   '#059669',
};

// Milestone status → display colour (matches Tab 3 CARD_BORDER)
const MS_COLOR: Record<string, string> = {
  'Planned':     'var(--blue)',
  'In Progress': 'var(--accent)',
  'Completed':   '#059669',
  'Delayed':     'var(--red)',
  'On Hold':     'var(--orange)',
};

// Kanban column top-border: green if any In Progress, red if any Delayed, else blue
function colBorderColor(items: any[]): string {
  if (items.some(i => i.status === 'In Progress')) return 'var(--accent)';
  if (items.some(i => i.status === 'Delayed'))     return 'var(--red)';
  return 'var(--blue)';
}

// Format YYYY-MM-DD → "1 Mar 2026" (confirmed format by user)
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    // Append T00:00:00 to prevent timezone offset shifting the day
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

const priorityColor = (p: string) =>
  ({ High: 'var(--red)', Medium: 'var(--orange)', Low: 'var(--blue)' }[p] || 'var(--text-muted)');

interface ActionItem { title: string; priority: string; teamId: string; teamName: string; }

// ─── Component ────────────────────────────────────────────────────────────────
const OverviewPage: React.FC = () => {
  const { t, currentLang, localeContent } = useI18nStore();
  const { sidebarCollapsed }              = useThemeStore();
  const { identity }                      = useConfigStore();
  const [lightbox, setLightbox]           = useState<string | null>(null);

  const sections = (localeContent as any)?.sections || {};

  // ── Exec Summary (Tab 3) ──────────────────────────────────────────────────
  const exec = useMemo(() => ({
    title:    sections.executive_summary?.title    ?? '',
    intro:    sections.executive_summary?.intro    ?? '',
    specs:    Array.isArray(sections.executive_summary?.specs)    ? sections.executive_summary.specs    : [],
    features: Array.isArray(sections.executive_summary?.features) ? sections.executive_summary.features : [],
  }), [sections.executive_summary]);

  // ── Timeline groups (Tab 3) ───────────────────────────────────────────────
  // Groups are rendered in the same array order as Tab 3.
  // Only groups with at least one milestone are shown (C2).
  // Backward compat: if old flat items[] exists, wrap in a single group.
  const { milestoneGroups, totalMilestones } = useMemo(() => {
    const tlData = sections.timeline;

    if (Array.isArray(tlData?.groups)) {
      // Current format — groups with items
      const validGroups = tlData.groups.filter(
        (g: any) => g.name && Array.isArray(g.items) && g.items.length > 0
      );
      const total = validGroups.reduce(
        (sum: number, g: any) => sum + (g.items?.length || 0), 0
      );
      return { milestoneGroups: validGroups, totalMilestones: total };
    }

    // Backward compat: old flat items[] → single group
    if (Array.isArray(tlData?.items) && tlData.items.length > 0) {
      return {
        milestoneGroups: [{ id: '_compat', name: 'Milestones', items: tlData.items }],
        totalMilestones: tlData.items.length,
      };
    }

    return { milestoneGroups: [], totalMilestones: 0 };
  }, [sections.timeline]);

  // ── Responsibility rows (Tab 3) ───────────────────────────────────────────
  const responsibilityRows: any[] = useMemo(() =>
    Array.isArray(sections.responsibility?.rows) ? sections.responsibility.rows : [],
  [sections.responsibility]);

  // ── Action items from team sections (TeamPage) ────────────────────────────
  const actionItems: ActionItem[] = useMemo(() => {
    const SKIP = new Set(['executive_summary', 'timeline', 'responsibility', 'risks', 'interfaces', 'actions', 'gallery']);
    const all: ActionItem[] = [];
    Object.entries(sections).forEach(([key, section]: [string, any]) => {
      if (SKIP.has(key) || !section || typeof section !== 'object') return;
      if (Array.isArray(section.actions)) {
        section.actions.forEach((a: any) => all.push({
          title:    a.action || a.title || 'Untitled',
          priority: a.priority || 'Medium',
          teamId:   key,
          teamName: section.scope?.name || section.name || key,
        }));
      }
    });
    return all;
  }, [sections]);

  // ── Team count ────────────────────────────────────────────────────────────
  const teamCount = useMemo(() => {
    const SKIP = new Set(['executive_summary', 'timeline', 'responsibility', 'risks', 'interfaces', 'actions', 'gallery']);
    return Object.keys(sections).filter(k => !SKIP.has(k)).length;
  }, [sections]);

  const productImages: string[] = identity.productImages || [];
  const hasModel                = !!identity.productModelUrl;
  const statusText              = identity.status ? getStatusLabel(identity.status, currentLang) : '';
  const statusColor             = PROJECT_STATUS_COLORS[identity.status] || 'var(--blue)';
  const hasExecContent          = exec.title || exec.intro || exec.specs.length > 0 || exec.features.length > 0;
  const hasTimeline             = milestoneGroups.length > 0;
  const hasResponsibility       = responsibilityRows.length > 0;

  return (
    <div style={{ width: '100%' }}>

      {/* ── 1. PROJECT IDENTITY BANNER ───────────────────────── */}
      <div style={{ marginBottom: 20, padding: '20px 24px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.2 }}>
            {identity.projectName || 'RAOSS Hub'}
          </h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: identity.description ? 8 : 0 }}>
            {[identity.productCode, identity.companyName].filter(Boolean).join(' · ')}
          </div>
          {identity.description && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55, maxWidth: 600, margin: 0 }}>
              {identity.description}
            </p>
          )}
        </div>
        {statusText && (
          <span style={{ padding: '5px 14px', borderRadius: 99, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}40`, flexShrink: 0, alignSelf: 'center' }}>
            {statusText}
          </span>
        )}
      </div>

      {/* ── 2. KPI CARDS ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: t('ov_kpi_actions',    'Open Actions'),  value: actionItems.length,  color: 'var(--red)',    icon: 'zap'    },
          { label: t('ov_kpi_milestones', 'Milestones'),    value: totalMilestones,     color: 'var(--blue)',   icon: 'target' },
          { label: t('ov_kpi_teams',      'Teams'),         value: teamCount,            color: 'var(--accent)', icon: 'users'  },
        ].map(kpi => {
          const IconComp = Icons[kpi.icon as keyof typeof Icons];
          return (
            <div key={kpi.label} style={{ padding: '18px 20px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color, lineHeight: 1.2 }}>{kpi.value}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 5 }}>
                {IconComp && <IconComp size={13} />}
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{kpi.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 3. TOP GRID: EXEC SUMMARY + 3D/IMAGE VIEWER ──────── */}
      {(hasExecContent || hasModel || productImages.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: sidebarCollapsed || (!hasExecContent || (!hasModel && productImages.length === 0)) ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {hasExecContent && (
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 3, height: 14, background: 'var(--accent)', borderRadius: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {exec.title || t('ov_exec_title', 'Executive Summary')}
                </span>
              </div>
              <div style={{ padding: '16px 20px' }}>
                {exec.intro && <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 12px' }}>{exec.intro}</p>}
                {exec.specs.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: exec.features.length > 0 ? 14 : 0 }}>
                    {exec.specs.map((s: string, i: number) => (
                      <span key={i} style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: 'var(--bg-overlay)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{s}</span>
                    ))}
                  </div>
                )}
                {exec.features.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {exec.features.map((f: string, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }}><Icons.check size={13} /></span>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {(hasModel || productImages.length > 0) && (
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icons.cube size={14} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {hasModel ? t('ov_3d_viewer', '3D Product Viewer') : t('ov_product_image', 'Product Image')}
                  </span>
                </div>
                {hasModel && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Drag to rotate</span>}
              </div>
              <div style={{ padding: hasModel ? 0 : 16 }}>
                {hasModel
                  ? <ModelViewer src={identity.productModelUrl} alt={`${identity.projectName || 'Product'} 3D`} />
                  : productImages.length > 0
                    ? <img src={productImages[0]} alt="Product" style={{ width: '100%', height: 260, objectFit: 'contain', display: 'block', background: 'var(--bg-overlay)', cursor: 'pointer' }} onClick={() => setLightbox(productImages[0])} />
                    : null}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 4. TIMELINE KANBAN ───────────────────────────────── */}
      {/* Groups rendered in Tab 3 array order. Empty groups hidden (C2). */}
      {/* Each milestone shows "Start Date: 1 Mar 2026" format (C1).      */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icons.calendar size={14} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            {t('ov_timeline', 'Timeline & Milestones')}
          </span>
        </div>
        <div style={{ padding: 14 }}>
          {!hasTimeline ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              {t('ov_no_milestones', 'No milestones yet. Add groups in Admin Setup → Dashboard Settings.')}
            </div>
          ) : (
            // Kanban grid — auto-fill columns, 260px minimum, same as v2
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {milestoneGroups.map((group: any) => {
                const borderColor = colBorderColor(group.items);
                return (
                  <div
                    key={group.id || group.name}
                    style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', borderTop: `3px solid ${borderColor}`, overflow: 'hidden' }}
                  >
                    {/* Column header = group name */}
                    <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: borderColor }}>
                        {group.name}
                      </span>
                      <span style={{ fontSize: 10, background: 'var(--bg-active)', padding: '1px 7px', borderRadius: 99, color: 'var(--text-muted)', fontWeight: 600 }}>
                        {group.items.length}
                      </span>
                    </div>
                    {/* Milestone cards */}
                    {group.items.map((item: any, i: number) => (
                      <div
                        key={item.id || i}
                        style={{ padding: '12px 14px', borderBottom: i < group.items.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                      >
                        {/* Title */}
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 6 }}>
                          {item.title}
                        </div>
                        {/* Date label + formatted date — C1: "Start Date: 1 Mar 2026" */}
                        {item.date && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontWeight: 600 }}>
                              {item.dateType === 'End Date'
                                ? t('milestone_end_date',   'End Date')
                                : t('milestone_start_date', 'Start Date')}:
                            </span>
                            <span>{formatDate(item.date)}</span>
                          </div>
                        )}
                        {/* Status badge */}
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, border: `1px solid ${MS_COLOR[item.status] || 'var(--text-muted)'}`, color: MS_COLOR[item.status] || 'var(--text-muted)', fontWeight: 600 }}>
                          {item.status || 'Planned'}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── 5. RESPONSIBILITY MATRIX ─────────────────────────── */}
      {hasResponsibility && (
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 3, height: 14, background: 'var(--purple)', borderRadius: 2, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              {t('ov_responsibility', 'Responsibility Matrix')}
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-overlay)' }}>
                  {[t('ov_resp_team','Team'), t('ov_resp_owner','Owner / Leader'), t('ov_resp_scope','Main Scope')].map(h => (
                    <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {responsibilityRows.map((row: any, i: number) => (
                  <tr key={row.id || i} style={{ borderBottom: i < responsibilityRows.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <td style={{ padding: '10px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{row.teamName || row.teamId || '—'}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{row.ownerName || '—'}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{row.mainScope || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 6. OPEN ACTIONS ──────────────────────────────────── */}
      {actionItems.length > 0 && (
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icons.zap size={14} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{t('ov_actions', 'Open Actions')}</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-overlay)' }}>
                {[t('ov_action_priority','Priority'), t('ov_action_task','Task'), t('ov_action_team','Team')].map(h => (
                  <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {actionItems.map((a, i) => (
                <tr key={i} style={{ borderBottom: i < actionItems.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <td style={{ padding: '9px 16px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 99, fontWeight: 600, background: `${priorityColor(a.priority)}15`, color: priorityColor(a.priority), border: `1px solid ${priorityColor(a.priority)}40` }}>{a.priority}</span>
                  </td>
                  <td style={{ padding: '9px 16px', fontSize: 12, color: 'var(--text-primary)' }}>{a.title}</td>
                  <td style={{ padding: '9px 16px', fontSize: 11, color: 'var(--text-muted)' }}>{a.teamName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 7. IMAGE GALLERY ─────────────────────────────────── */}
      {productImages.length > 0 && (
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icons.image size={14} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{t('ov_gallery', 'Gallery')}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>{productImages.length} {productImages.length === 1 ? 'photo' : 'photos'}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 2, padding: 2 }}>
            {productImages.map((url, i) => (
              <div key={i} style={{ position: 'relative', paddingBottom: '66%', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setLightbox(url)}>
                <img src={url} alt={`Product ${i + 1}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'opacity 0.15s' }} onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── EMPTY STATE ──────────────────────────────────────── */}
      {!hasExecContent && !hasTimeline && !hasResponsibility && actionItems.length === 0 && productImages.length === 0 && (
        <div style={{ padding: '40px 24px', textAlign: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: 10 }}><Icons.info size={24} /></div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.65, maxWidth: 440, margin: '0 auto' }}>
            No content yet. Go to <strong style={{ color: 'var(--text-secondary)' }}>Admin Setup → Dashboard Settings</strong> to add your Executive Summary, Timeline, and Responsibility Matrix.
          </p>
        </div>
      )}

      {/* ── LIGHTBOX ─────────────────────────────────────────── */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out' }}>
          <img src={lightbox} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }} />
        </div>
      )}
    </div>
  );
};

export default React.memo(OverviewPage);
