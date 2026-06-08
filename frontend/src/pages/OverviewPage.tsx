import React, { useState } from 'react';
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

const TL_STATUS_COLORS: Record<string, string> = {
  planned: 'var(--blue)',
  current: 'var(--accent)',
  done: '#6b7280',
  delayed: 'var(--red)',
  'on-hold': '#9ca3af',
};

const OverviewPage: React.FC = () => {
  const { t } = useI18nStore();
  const { sidebarCollapsed } = useThemeStore();
  const { identity } = useConfigStore();

  const [activeImg, setActiveImg] = useState(0);

  const productImages: string[] = identity.productImages || [];
  const hasModel = !!identity.productModelUrl;
  const statusColor = STATUS_COLORS[identity.status] || STATUS_COLORS.planning;

  // ─── KPI Stats ───────────────────────────────────────────
  const kpis = [
    { label: t('ov_kpi_actions') || 'Open Actions', value: '0', icon: 'zap' as const, color: 'var(--red)' },
    { label: t('ov_kpi_milestones') || 'Milestones', value: '0', icon: 'target' as const, color: 'var(--blue)' },
    { label: t('ov_kpi_teams') || 'Teams', value: '8', icon: 'users' as const, color: 'var(--orange)' },
  ];

  // ─── Milestones (placeholder data from config) ──────────
  const timelinePhases = [
    { quarter: 'Q1 2026', items: [
      { title: 'Concept & Feasibility', status: 'done', desc: 'Market research and concept validation' },
      { title: 'Design Specification', status: 'done', desc: 'Complete product design spec' },
    ]},
    { quarter: 'Q2 2026', items: [
      { title: 'Prototype Build', status: 'current', desc: 'First working prototype' },
      { title: 'Firmware Development', status: 'planned', desc: 'Core firmware implementation' },
    ]},
    { quarter: 'Q3 2026', items: [
      { title: 'PCBA Fabrication', status: 'planned', desc: 'PCB assembly and testing' },
      { title: 'TFT Integration', status: 'planned', desc: 'Display module integration' },
    ]},
  ];

  // ─── Open Actions ───────────────────────────────────────
  const actions = [
    { priority: 'high', title: 'Complete prototype PCB layout review', owner: 'Rizan', due: '2026-06-15', tag: 'PCBA' },
    { priority: 'high', title: 'Finalize firmware architecture document', owner: 'Rizan', due: '2026-06-20', tag: 'Firmware' },
    { priority: 'medium', title: 'Source 2.4" TFT display samples', owner: 'Rizan', due: '2026-06-25', tag: 'TFT' },
  ];

  const priorityClass = (p: string) => p === 'high' ? 'var(--red)' : p === 'medium' ? 'var(--orange)' : 'var(--blue)';

  // ─── Responsibility Matrix ──────────────────────────────
  const respMatrix = [
    { role: 'Project Lead', name: 'Rizan', responsibility: 'Overall project direction & coordination' },
    { role: 'Hardware Lead', name: 'Rizan', responsibility: 'PCBA, TFT, Charger, Shell hardware design' },
    { role: 'Firmware Lead', name: 'Rizan', responsibility: 'ESP32 firmware, audio, WiFi, BLE' },
    { role: 'App Developer', name: 'Rizan', responsibility: 'React Native mobile application' },
  ];

  const twoCol = !sidebarCollapsed;

  return (
    <div style={{ width: '100%' }}>

      {/* ═══ 1. PROJECT IDENTITY BANNER ═══════════════════════ */}
      <div style={{
        marginBottom: 20, padding: '20px 24px', background: 'var(--bg-elevated)',
        border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.2 }}>
            {identity.projectName || 'Project Name'}
          </h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
            {identity.productCode || 'Product Code'} · {identity.companyName || 'Company Name'}
          </div>
          {identity.description && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: 600 }}>
              {identity.description}
            </p>
          )}
        </div>
        <div style={{
          padding: '6px 18px', borderRadius: 99, background: statusColor.bg,
          color: statusColor.text, fontSize: 12, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0, alignSelf: 'center',
        }}>
          {identity.status?.replace('-', ' ') || 'Planning'}
        </div>
      </div>

      {/* ═══ 2. STATS / KPI ROW ═══════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {kpis.map((kpi) => (
          <div key={kpi.label} style={{
            padding: '16px 20px', background: 'var(--bg-elevated)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: kpi.color, lineHeight: 1.2 }}>{kpi.value}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>{React.createElement(Icons[kpi.icon] || Icons.info, { size: 14 })}</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{kpi.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ 3. EXECUTIVE SUMMARY + 3D VIEWER ═════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: twoCol && hasModel ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 24 }}>
        {/* Executive Summary */}
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icons.target size={16} />
            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Executive Summary</h2>
          </div>
          <div style={{ padding: 16 }}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
              {identity.description || 'Smart Azan alarm clock with prayer time display, Qibla direction, and mobile app connectivity.'}
            </p>
            {/* Spec chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {['ESP32-S3', '2.4" TFT 320x240', 'WiFi + BLE', 'USB-C', 'Li-Po Battery'].map((s) => (
                <span key={s} style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 99,
                  background: 'var(--accent-dim)', color: 'var(--accent)', fontWeight: 600,
                }}>{s}</span>
              ))}
            </div>
            {/* Feature list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {['Automatic Azan prayer times', 'Qibla compass direction', 'Mobile app control (iOS/Android)', 'OTA firmware updates', 'Multi-language support'].map((f) => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--accent)' }}><Icons.check size={14} /></span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3D Viewer */}
        {hasModel && (
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icons.box size={16} />
              <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>3D Product Viewer</h2>
            </div>
            <div style={{ padding: 0 }}>
              <ModelViewer src={identity.productModelUrl} alt={`${identity.projectName || 'Product'} 3D Model`} />
            </div>
          </div>
        )}
      </div>

      {/* ═══ 4. TIMELINE & MILESTONES (Kanban) ════════════════ */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icons.calendar size={16} />
            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Timeline &amp; Milestones</h2>
          </div>
        </div>
        <div style={{ padding: 12, overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: 12, minWidth: 600 }}>
            {timelinePhases.map((phase) => {
              const hasCurrent = phase.items.some(i => i.status === 'current');
              const hasDelayed = phase.items.some(i => i.status === 'delayed');
              const headerColor = hasCurrent ? 'var(--accent)' : hasDelayed ? 'var(--red)' : 'var(--blue)';
              return (
                <div key={phase.quarter} style={{
                  flex: 1, minWidth: 180, borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)', background: 'var(--bg-base)',
                  borderTop: `3px solid ${headerColor}`,
                }}>
                  {/* Column header */}
                  <div style={{
                    padding: '10px 12px', fontSize: 12, fontWeight: 700,
                    color: headerColor, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}>
                    {phase.quarter}
                    <span style={{
                      fontSize: 10, padding: '1px 7px', borderRadius: 99,
                      background: 'var(--bg-overlay)', color: 'var(--text-muted)', fontWeight: 600,
                    }}>{phase.items.length}</span>
                  </div>
                  {/* Items */}
                  <div style={{ padding: 8 }}>
                    {phase.items.map((item, idx) => (
                      <div key={idx} style={{
                        padding: '8px 10px', marginBottom: 6, borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
                          {item.title}
                        </div>
                        {item.desc && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{item.desc}</div>
                        )}
                        <span style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 10,
                          border: `1px solid ${TL_STATUS_COLORS[item.status] || 'var(--text-muted)'}`,
                          color: TL_STATUS_COLORS[item.status] || 'var(--text-muted)',
                        }}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ 5. OPEN ACTIONS TABLE ════════════════════════════ */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icons.zap size={16} />
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Open Actions</h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Priority</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Task</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Owner</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Due</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tag</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((a, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                      padding: '2px 8px', borderRadius: 99,
                      background: `${priorityClass(a.priority)}20`, color: priorityClass(a.priority),
                    }}>
                      {a.priority}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-primary)', maxWidth: 280 }}>{a.title}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{a.owner}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{a.due}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 99,
                      background: 'var(--accent-dim)', color: 'var(--accent)', fontWeight: 600,
                    }}>{a.tag}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ 6. RESPONSIBILITY MATRIX ═════════════════════════ */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icons.users size={16} />
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Responsibility Matrix</h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Responsibility</th>
              </tr>
            </thead>
            <tbody>
              {respMatrix.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>{r.role}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{r.name}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{r.responsibility}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ 7. PRODUCT GALLERY (at bottom, like v2) ══════════ */}
      {productImages.length > 0 && (
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icons.image size={16} />
              <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Product Gallery</h2>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{productImages.length} images</span>
          </div>
          <div style={{ padding: 16 }}>
            {/* Main image */}
            <div style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-subtle)', marginBottom: 10 }}>
              <img
                src={productImages[activeImg]}
                alt="Product"
                style={{ width: '100%', height: 280, objectFit: 'contain', background: 'var(--bg-base)' }}
              />
              {productImages.length > 1 && (
                <>
                  <button onClick={() => setActiveImg((i) => (i - 1 + productImages.length) % productImages.length)}
                    style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', fontSize: 14, cursor: 'pointer' }}>
                    <Icons.chevronLeft size={14} />
                  </button>
                  <button onClick={() => setActiveImg((i) => (i + 1) % productImages.length)}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', fontSize: 14, cursor: 'pointer' }}>
                    <Icons.chevronRight size={14} />
                  </button>
                </>
              )}
            </div>
            {/* Thumbnails */}
            {productImages.length > 1 && (
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
                {productImages.map((url, idx) => (
                  <button key={idx} onClick={() => setActiveImg(idx)}
                    style={{
                      padding: 0, border: `2px solid ${idx === activeImg ? 'var(--accent)' : 'transparent'}`,
                      borderRadius: 'var(--radius-sm)', overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
                    }}>
                    <img src={url} alt="" style={{ width: 56, height: 42, objectFit: 'cover', display: 'block' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ 8. DOCUMENT VERSION HISTORY (last) ═══════════════ */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icons.clock size={16} />
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Document Version History</h2>
        </div>
        <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
          No version history yet.
        </div>
      </div>

    </div>
  );
};

export default React.memo(OverviewPage);
