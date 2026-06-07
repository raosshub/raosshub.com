import React, { useMemo, useState } from 'react';
import { useI18nStore } from '@/stores/useI18nStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useConfigStore } from '@/stores/useConfigStore';
import { Icons } from '@/components/icons';
import ModelViewer from '@/components/ModelViewer';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  planning:      { bg: 'var(--text-muted)', text: 'var(--text-inverse)' },
  development:   { bg: 'var(--blue)', text: 'var(--text-inverse)' },
  prototype:     { bg: 'var(--orange)', text: 'var(--text-inverse)' },
  production:    { bg: 'var(--green)', text: 'var(--text-inverse)' },
  maintenance:   { bg: 'var(--purple)', text: 'var(--text-inverse)' },
  completed:     { bg: 'var(--accent)', text: 'var(--text-inverse)' },
};

interface Milestone { title: string; date: string; status: string; }
interface ActionItem { title: string; priority: string; teamId: string; teamName: string; }

const OverviewPage: React.FC = () => {
  const { t, localeContent } = useI18nStore();
  const { sidebarCollapsed } = useThemeStore();
  const { identity } = useConfigStore();

  const [activeImg, setActiveImg] = useState(0);

  const sections = (localeContent as any)?.sections || {};

  // ─── Extract data ────────────────────────────────────────────
  const { milestones, actionItems, teamCount } = useMemo(() => {
    const allMilestones: Milestone[] = [];
    const allActions: ActionItem[] = [];
    let tCount = 0;

    Object.entries(sections).forEach(([key, section]: [string, any]) => {
      if (!section || typeof section !== 'object') return;
      if (section.milestones && Array.isArray(section.milestones)) {
        section.milestones.forEach((m: any) => allMilestones.push({
          title: m.title || m.title_zh || 'Untitled', date: m.date || '', status: m.status || 'Planned',
        }));
      }
      if (section.actions && Array.isArray(section.actions)) {
        section.actions.forEach((a: any) => allActions.push({
          title: a.action || a.title || 'Untitled', priority: a.priority || 'Medium', teamId: key, teamName: section.scope?.name || key,
        }));
      }
      tCount++;
    });

    return { milestones: allMilestones.sort((a, b) => new Date(a.date || '').getTime() - new Date(b.date || '').getTime()), actionItems: allActions, teamCount: tCount };
  }, [sections]);

  const productImages: string[] = identity.productImages || [];
  const hasModel = !!identity.productModelUrl;
  const statusColor = STATUS_COLORS[identity.status] || STATUS_COLORS.planning;

  const kpis = [
    { label: t('ov_kpi_actions'), value: actionItems.length.toString(), icon: 'zap' as const, accent: '#d29922', bg: 'var(--orange-dim)' },
    { label: t('ov_kpi_milestones'), value: milestones.length.toString(), icon: 'target' as const, accent: '#58a6ff', bg: 'var(--blue-dim)' },
    { label: t('ov_kpi_teams'), value: teamCount.toString(), icon: 'users' as const, accent: '#3fb950', bg: 'var(--accent-dim)' },
  ];

  const priorityColor = (p: string) => ({ High: 'var(--red)', Medium: 'var(--orange)', Low: 'var(--blue)' }[p] || 'var(--text-muted)');

  return (
    <div style={{ width: '100%' }}>

      {/* ═══ HEADER: Project Identity Banner ═══════════════════ */}
      <div style={{
        marginBottom: 20,
        padding: '20px 24px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Line 1: Project Name */}
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.2 }}>
            {identity.projectName || 'Project Name'}
          </h1>
          {/* Line 2: Product Code */}
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
            {identity.productCode || 'Product Code'} · {identity.companyName || 'Company Name'}
          </div>
          {/* Description */}
          {identity.description && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: 600 }}>
              {identity.description}
            </p>
          )}
        </div>

        {/* Status Badge */}
        <div style={{
          padding: '6px 18px',
          borderRadius: 99,
          background: statusColor.bg,
          color: statusColor.text,
          fontSize: 12,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          flexShrink: 0,
          alignSelf: 'center',
        }}>
          {identity.status?.replace('-', ' ') || 'Planning'}
        </div>
      </div>

      {/* ═══ KPI CARDS ════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {kpis.map((kpi) => (
          <div key={kpi.label} style={{ padding: '16px 20px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: kpi.accent, lineHeight: 1.2 }}>{kpi.value}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>{React.createElement(Icons[kpi.icon] || Icons.info, { size: 14 })}</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{kpi.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ PRODUCT VISUALS ══════════════════════════════════ */}
      {(productImages.length > 0 || hasModel) && (
        <div style={{ marginBottom: 24, display: 'grid', gridTemplateColumns: productImages.length > 0 && hasModel ? (sidebarCollapsed ? '1fr' : '1fr 1fr') : '1fr', gap: 16 }}>

          {/* Product Image Gallery */}
          {productImages.length > 0 && (
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Product Gallery</h3>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{productImages.length} images</span>
              </div>

              {/* Main Image */}
              <div style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-subtle)', marginBottom: 10 }}>
                <img src={productImages[activeImg]} alt="Product" style={{ width: '100%', height: 240, objectFit: 'contain', background: 'var(--bg-base)' }} />
                {productImages.length > 1 && (
                  <>
                    <button onClick={() => setActiveImg((i) => (i - 1 + productImages.length) % productImages.length)}
                      style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
                    <button onClick={() => setActiveImg((i) => (i + 1) % productImages.length)}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {productImages.length > 1 && (
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
                  {productImages.map((url, idx) => (
                    <button key={idx} onClick={() => setActiveImg(idx)} style={{ padding: 0, border: `2px solid ${idx === activeImg ? 'var(--accent)' : 'transparent'}`, borderRadius: 'var(--radius-sm)', overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}>
                      <img src={url} alt="" style={{ width: 56, height: 42, objectFit: 'cover', display: 'block' }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3D Model */}
          {hasModel && (
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>3D Model</h3>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Drag to rotate</span>
              </div>
              <ModelViewer src={identity.productModelUrl} alt={`${identity.projectName || 'Product'} 3D Model`} />
            </div>
          )}
        </div>
      )}

      {/* ═══ TWO-COLUMN LAYOUT ════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: sidebarCollapsed ? '1fr' : '1fr 1fr', gap: 16 }}>
        {/* Milestones */}
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Upcoming Milestones</div>
            <Icons.calendar size={14} />
          </div>
          {milestones.length === 0 ? (
            <div style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>{t('ov_no_milestones')}</div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {milestones.slice(0, 6).map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '7px 18px', gap: 10 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: m.status === 'Done' ? 'var(--accent)' : m.status === 'Current' ? 'var(--orange)' : 'var(--text-muted)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>{m.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Open Actions */}
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Open Actions</div>
            <Icons.zap size={14} />
          </div>
          {actionItems.length === 0 ? (
            <div style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>{t('ov_no_actions')}</div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {actionItems.slice(0, 8).map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '6px 18px', gap: 10 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: priorityColor(a.priority), flexShrink: 0 }} />
                  <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
                  <span style={{ fontSize: 10, color: priorityColor(a.priority), fontWeight: 600, padding: '1px 7px', borderRadius: 99, flexShrink: 0, background: `var(--${a.priority === 'High' ? 'red' : a.priority === 'Medium' ? 'orange' : 'blue'}-dim)` }}>{a.priority}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {milestones.length === 0 && actionItems.length === 0 && (
        <div style={{ marginTop: 20, padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          <Icons.info size={24} />
          <p style={{ marginTop: 8 }}>No data yet. Use HUB Assist to populate milestones and action items.</p>
        </div>
      )}
    </div>
  );
};

export default React.memo(OverviewPage);
