import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18nStore } from '@/stores/useI18nStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { Icons } from '@/components/icons';

interface Milestone {
  title: string;
  date: string;
  status: string;
}

interface ActionItem {
  title: string;
  priority: string;
  teamId: string;
  teamName: string;
}

const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, localeContent, currentLang } = useI18nStore();
  const { sidebarCollapsed } = useThemeStore();
  const { user } = useAuthStore();

  const isSuperAdmin = (user as any)?.role === 'superadmin';

  const sections = (localeContent as any)?.sections || {};

  // ─── Extract data from locale content ────────────────────────
  const { milestones, actionItems, deliverables, teamCount } = useMemo(() => {
    const allMilestones: Milestone[] = [];
    const allActions: ActionItem[] = [];
    const allDeliverables: any[] = [];
    let tCount = 0;

    Object.entries(sections).forEach(([key, section]: [string, any]) => {
      if (!section || typeof section !== 'object') return;

      // Milestones
      if (section.milestones && Array.isArray(section.milestones)) {
        section.milestones.forEach((m: any) => {
          allMilestones.push({
            title: m.title || m.title_zh || 'Untitled',
            date: m.date || m.date_zh || '',
            status: m.status || 'Planned',
          });
        });
      }

      // Actions
      if (section.actions && Array.isArray(section.actions)) {
        section.actions.forEach((a: any) => {
          allActions.push({
            title: a.action || a.title || 'Untitled',
            priority: a.priority || 'Medium',
            teamId: key,
            teamName: section.scope?.name || key,
          });
        });
      }

      // Deliverables
      if (section.deliverables && Array.isArray(section.deliverables)) {
        section.deliverables.forEach((d: any) => {
          allDeliverables.push({
            ...d,
            teamId: key,
            teamName: section.scope?.name || key,
          });
        });
      }

      tCount++;
    });

    return {
      milestones: allMilestones.sort(
        (a, b) => new Date(a.date || '').getTime() - new Date(b.date || '').getTime()
      ),
      actionItems: allActions,
      deliverables: allDeliverables,
      teamCount: tCount,
    };
  }, [sections]);

  // ─── KPI Cards ───────────────────────────────────────────────
  const kpis = [
    {
      label: t('ov_kpi_actions'),
      value: actionItems.length.toString(),
      icon: 'zap' as const,
      accent: '#d29922',
      bg: 'var(--orange-dim)',
    },
    {
      label: t('ov_kpi_milestones'),
      value: milestones.length.toString(),
      icon: 'target' as const,
      accent: '#58a6ff',
      bg: 'var(--blue-dim)',
    },
    {
      label: t('ov_kpi_teams'),
      value: teamCount.toString(),
      icon: 'users' as const,
      accent: '#3fb950',
      bg: 'var(--accent-dim)',
    },
  ];

  const priorityColor = (p: string) => {
    const map: Record<string, string> = {
      High: 'var(--red)',
      Medium: 'var(--orange)',
      Low: 'var(--blue)',
    };
    return map[p] || 'var(--text-muted)';
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
            {t('nav_overview')}
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
            RAOSS Hub Dashboard
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            style={{
              padding: '16px 20px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              textAlign: 'center',
              transition: 'border-color var(--transition)',
            }}
          >
            <div style={{ fontSize: 26, fontWeight: 700, color: kpi.accent, lineHeight: 1.2 }}>
              {kpi.value}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>
                {React.createElement(Icons[kpi.icon] || Icons.info, { size: 14 })}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500, letterSpacing: '0.2px' }}>
                {kpi.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: sidebarCollapsed ? '1fr' : '1fr 1fr', gap: 16 }}>
        {/* Milestones */}
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              Upcoming Milestones
            </div>
            <Icons.calendar size={14} />
          </div>
          {milestones.length === 0 ? (
            <div style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              {t('ov_no_milestones')}
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {milestones.slice(0, 6).map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '7px 18px', gap: 10 }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: m.status === 'Done' ? 'var(--accent)' : m.status === 'Current' ? 'var(--orange)' : 'var(--text-muted)',
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.title}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>
                    {m.date}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Open Actions */}
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              Open Actions
            </div>
            <Icons.zap size={14} />
          </div>
          {actionItems.length === 0 ? (
            <div style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              {t('ov_no_actions')}
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {actionItems.slice(0, 8).map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '6px 18px', gap: 10 }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: priorityColor(a.priority),
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.title}
                  </span>
                  <span style={{
                    fontSize: 10, color: priorityColor(a.priority), fontWeight: 600,
                    padding: '1px 7px', borderRadius: 99, flexShrink: 0,
                    background: `var(--${a.priority === 'High' ? 'red' : a.priority === 'Medium' ? 'orange' : 'blue'}-dim)`,
                  }}>
                    {a.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Empty state hint */}
      {milestones.length === 0 && actionItems.length === 0 && (
        <div style={{ marginTop: 20, padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          <Icons.info size={24} />
          <p style={{ marginTop: 8 }}>
            No data yet. Use HUB Assist to populate milestones and action items for your project.
          </p>
        </div>
      )}
    </div>
  );
};

export default React.memo(OverviewPage);
