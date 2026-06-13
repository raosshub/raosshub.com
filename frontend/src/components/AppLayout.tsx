import React, { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore }            from '@/stores/useAuthStore';
import { useI18nStore }            from '@/stores/useI18nStore';
import { useThemeStore }           from '@/stores/useThemeStore';
import { useConfigStore }          from '@/stores/useConfigStore';
import { useNotificationStore }    from '@/stores/useNotificationStore';
import { teamApi }                 from '@/utils/api';
import { useUIStore }              from '@/stores/useUIStore';
import HubAssistPage              from '@/pages/HubAssistPage';
import type { Team, User }        from '@/types';
import { Icons }                   from '@/components/icons';
import { STATUS_OPTIONS, getStatusLabel } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  planning:        '#6b7280',
  development:     '#3b82f6',
  prototype:       '#f59e0b',
  production:      '#10b981',
  maintenance:     '#8b5cf6',
  completed:       '#059669',
  // Legacy DB values before Tab 1 normalisation
  'in development':  '#3b82f6',
  'in-development':  '#3b82f6',
  'in_development':  '#3b82f6',
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout }                          = useAuthStore();

  // Guards all sidebar navigation — shows confirm when Tab 2 translation is running.
  // Reads from useUIStore (not React state) to avoid re-render overhead.
  const guardedNavigate = useCallback((path: string) => {
    if (useUIStore.getState().translationRunning) {
      const ok = window.confirm(
        'Translation is in progress.\n\nNavigating away will stop the translation. Continue?'
      );
      if (!ok) return;
    }
    navigate(path);
  }, [navigate]);
  const { t, currentLang, setLanguage, languages } = useI18nStore();
  const { theme, toggleTheme, sidebarCollapsed, toggleSidebar } = useThemeStore();
  const { identity, notifications, loaded, load, getBreadcrumb } = useConfigStore();

  const [teams, setTeams]             = React.useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [trayOpen, setTrayOpen]       = React.useState(false);
  // Right sidebar: collapsed by default (56px), expanded (360px). Always mounted.
  const [assistCollapsed, setAssistCollapsed] = React.useState(true);
  const bellRef                       = React.useRef<HTMLDivElement>(null);

  const { notifications: notifItems, markAllRead, dismissNotification, clearAll } = useNotificationStore();
  const unreadCount = notifItems.filter((n) => !n.read).length;

  // Inject pulse keyframe once — used for the unread dot on the bell
  useEffect(() => {
    if (!document.getElementById('hub-notif-kf')) {
      const s = document.createElement('style');
      s.id = 'hub-notif-kf';
      s.textContent = `
        @keyframes hub-pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.6; transform:scale(1.35); }
        }`;
      document.head.appendChild(s);
    }
  }, []);

  // Close tray on outside click
  useEffect(() => {
    if (!trayOpen) return;
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setTrayOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [trayOpen]);

  const isSuperAdmin = (user as User)?.role === 'superadmin';
  const isAdmin      = isSuperAdmin || (user as User)?.role === 'admin';
  const isZh         = currentLang === 'zh';

  useEffect(() => {
    load();
    teamApi.getAll().then((res) => setTeams(res.data.data)).catch(() => {});
  }, [load]);

  const currentPath = location.pathname;
  const breadcrumb  = getBreadcrumb(currentPath, t);
  const statusText  = identity.status ? getStatusLabel(identity.status, currentLang) : '';
  const statusColor = STATUS_COLORS[identity.status] || identity.primaryColor || 'var(--accent)';
  const icpLine     = isZh ? identity.icpZh : identity.icpEn;
  const userInitial = (user as User)?.firstName?.[0] || (user as User)?.username?.[0]?.toUpperCase() || '?';

  const activeLanguages = languages.filter((l) => l.isActive);

  const teamNavItems = teams
    .filter((team) => !searchQuery ||
      (isZh ? team.nameZh : team.nameEn).toLowerCase().includes(searchQuery.toLowerCase()))
    .map((team) => ({
      id:    team.teamId,
      label: isZh ? (team.nameZh || team.nameEn) : team.nameEn,
      icon:  (team.icon as keyof typeof Icons) || 'package',
      path:  `/team/${team.teamId}`,
    }));

  const mainNavItems = [
    { id: 'overview', label: t('nav_overview') || 'Overview', icon: 'overview' as const, path: '/' },
  ];

  const filteredMain = !searchQuery
    ? mainNavItems
    : mainNavItems.filter((i) => i.label.toLowerCase().includes(searchQuery.toLowerCase()));

  function NavItem({ id, label, icon, path }: { id: string; label: string; icon: keyof typeof Icons; path: string }) {
    const active   = currentPath === path || (path !== '/' && currentPath.startsWith(path));
    const IconComp = Icons[icon];
    return (
      <button onClick={() => guardedNavigate(path)} title={sidebarCollapsed ? label : undefined}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: sidebarCollapsed ? '9px 6px' : '8px 10px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', background: active ? 'var(--bg-active)' : 'transparent', color: active ? 'var(--text-primary)' : 'var(--text-secondary)', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', transition: 'all var(--transition)' }}>
        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', color: active ? 'var(--accent)' : 'inherit' }}>
          {IconComp && <IconComp size={16} />}
        </span>
        {!sidebarCollapsed && <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
      </button>
    );
  }

  function UtilButton({ icon, label: lbl, onClick, accent, danger, active: isActive }: { icon: keyof typeof Icons; label: string; onClick: () => void; accent?: boolean; danger?: boolean; active?: boolean; }) {
    const IconComp = Icons[icon];
    return (
      <button onClick={onClick} title={sidebarCollapsed ? lbl : undefined}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: sidebarCollapsed ? '8px 6px' : '8px 10px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', background: isActive ? 'var(--bg-active)' : 'transparent', color: accent ? 'var(--accent)' : danger ? 'var(--red)' : 'var(--text-secondary)', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', transition: 'all var(--transition)' }}>
        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{IconComp && <IconComp size={16} />}</span>
        {!sidebarCollapsed && <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>{lbl}</span>}
      </button>
    );
  }

  // Shared section style — used by left sidebar blocks and right sidebar body
  const secSt: React.CSSProperties = {
    background:   'var(--sidebar-bg)',
    border:       '1px solid var(--sidebar-border)',
    borderRadius: 'var(--radius)',
    flexShrink:   0,
  };
  // Brand-block style — used by Left TB and Right TB
  const tbSt: React.CSSProperties = {
    background:   'var(--bg-base)',
    border:       '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    height:       56,
    flexShrink:   0,
    display:      'flex',
    alignItems:   'center',
    overflow:     'hidden',
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-base)', padding: 10, gap: 10, boxSizing: 'border-box' }}>

      {/* ─── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
      <aside style={{ width: sidebarCollapsed ? 56 : 248, display: 'flex', flexDirection: 'column', flexShrink: 0, gap: 10, transition: 'width 0.25s ease', overflow: 'hidden' }}>

        {/* Left TB — brand block, same style as Right TB */}
        <div style={{ ...tbSt, padding: sidebarCollapsed ? '0 6px' : '0 14px', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', background: identity.logoUrl ? 'transparent' : 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontWeight: 700, fontSize: 16, flexShrink: 0, border: identity.logoUrl ? 'none' : '1px dashed var(--border)' }}>
            {identity.logoUrl
              ? <img src={identity.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <span>{(identity.projectName || 'R')[0]}</span>}
          </div>
          {!sidebarCollapsed && (
            <div style={{ marginLeft: 11, overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                {identity.projectName || 'The HUB'}
              </div>
              {identity.productCode && (
                <div style={{ fontSize: 10, color: identity.primaryColor || 'var(--accent)', fontWeight: 600, letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
                  {identity.productCode}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 1 — hamburger + search */}
        <div style={{ ...secSt, padding: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={toggleSidebar} style={{ width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }} title={sidebarCollapsed ? 'Expand' : 'Collapse'}>
              <Icons.menu size={16} />
            </button>
            {!sidebarCollapsed && (
              <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: 8, color: 'var(--text-muted)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}><Icons.search size={12} /></span>
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('search_placeholder') || 'Search…'} style={{ width: '100%', padding: '5px 8px 5px 26px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 12, outline: 'none' }} />
              </div>
            )}
          </div>
        </div>

        {/* Section 2 — Overview + teams nav */}
        <div style={{ ...secSt, flex: 1, overflowY: 'auto', padding: 6, minHeight: 0 }}>
          {filteredMain.map((item) => <NavItem key={item.id} {...item} />)}
          {teamNavItems.length > 0 && (
            <>
              {!sidebarCollapsed && <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', padding: '10px 10px 4px' }}>{t('nav_teams_group') || 'Teams'}</div>}
              {teamNavItems.map((item) => <NavItem key={item.id} {...item} />)}
            </>
          )}
        </div>

        {/* Section 3 — tools: theme · activity log · admin · settings · sign out */}
        <div style={{ ...secSt, padding: 6 }}>
          <UtilButton icon="sun"      label={theme === 'dark' ? (t('tool_theme_light') || 'Light Mode') : (t('tool_theme_dark') || 'Dark Mode')} onClick={toggleTheme} />
          {isAdmin      && <UtilButton icon="clock"    label={t('tool_activity_log') || 'Activity Log'} onClick={() => guardedNavigate('/activity-log')} active={currentPath === '/activity-log'} />}
          {isSuperAdmin && <UtilButton icon="shield"   label={t('nav_admin_setup', 'Admin Setup')}       onClick={() => guardedNavigate('/admin/setup')}  active={currentPath.startsWith('/admin')} />}
          <UtilButton   icon="settings" label={t('nav_settings') || 'Settings'}   onClick={() => guardedNavigate('/settings')} active={currentPath === '/settings'} />
          <UtilButton   icon="logout"   label={t('tool_sign_out') || 'Sign Out'}   onClick={logout} danger />
        </div>

        {/* Section 4 — footer: 5 project info lines from Tab 1 */}
        {!sidebarCollapsed && (identity.version || icpLine || identity.patentNotice || identity.trademarkNotice || identity.copyrightNotice || identity.companyName) && (
          <div style={{ ...secSt, padding: '10px 14px' }}>
            {notifications?.showVersion !== false && identity.version && (
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2, opacity: 0.9 }}>
                {t('version_prefix', 'Document Version')} {identity.version}
              </div>
            )}
            {icpLine                  && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, opacity: 0.8 }}>{icpLine}</div>}
            {identity.patentNotice    && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, opacity: 0.8 }}>{identity.patentNotice}</div>}
            {identity.trademarkNotice && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, opacity: 0.8 }}>{identity.trademarkNotice}</div>}
            {(identity.copyrightNotice || identity.companyName) && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.8 }}>
                {identity.copyrightNotice || `© ${new Date().getFullYear()} ${identity.companyName}`}
              </div>
            )}
          </div>
        )}

      </aside>

      {/* ─── MAIN COLUMN ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, gap: 10 }}>

        {/* Topbar */}
        <header style={{ height: 56, background: 'var(--topbar-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', padding: '0 16px', flexShrink: 0, position: 'relative', zIndex: 300 }}>

          {/* Left: breadcrumb */}
          <div style={{ flexShrink: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.2px', whiteSpace: 'nowrap' }}>
              {breadcrumb}
            </span>
          </div>

          {/* Centre: status badge with translated label */}
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center' }}>
            {statusText && (
              <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, letterSpacing: '0.3px', textTransform: 'uppercase', background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}40` }}>
                {statusText}
              </span>
            )}
          </div>

          {/* Right: controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexShrink: 0 }}>

            {/* Language dropdown — auto-populates from active languages.
                When a new language is added and activated in Admin Setup Tab 2,
                it appears here automatically with no code changes needed. */}
            {activeLanguages.length > 1 && (
              <select
                value={currentLang}
                onChange={(e) => setLanguage(e.target.value)}
                style={{ padding: '4px 10px', borderRadius: 99, border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-overlay)', cursor: 'pointer', outline: 'none' }}
              >
                {activeLanguages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nameNative} ({l.code.toUpperCase()})
                  </option>
                ))}
              </select>
            )}

            {/* Notification bell + tray */}
            <div ref={bellRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { const next = !trayOpen; setTrayOpen(next); if (next) markAllRead(); }}
                title={t('notif_title', 'Notifications')}
                style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: unreadCount > 0 ? 'var(--text-primary)' : 'var(--text-secondary)', background: trayOpen ? 'var(--bg-hover)' : 'none', border: 'none', cursor: 'pointer', position: 'relative' }}
              >
                <Icons.bell size={16} />
                {/* Pulsing red dot — shown when there are unread notifications */}
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: '50%', background: 'var(--red)', border: '1.5px solid var(--bg-base)', animation: 'hub-pulse 2s ease-in-out infinite' }} />
                )}
              </button>

              {/* Dropdown tray */}
              {trayOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 300, maxHeight: 380, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', zIndex: 8500, display: 'flex', flexDirection: 'column', animation: 'fadeDown 0.18s ease' }}>

                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {t('notif_title', 'Notifications')}
                    </span>
                    {notifItems.length > 0 && (
                      <button onClick={clearAll} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', padding: '2px 6px' }}>
                        {t('notif_clear', 'Clear all')}
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    {notifItems.length === 0 ? (
                      <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                        {t('notif_empty', 'No notifications')}
                      </div>
                    ) : notifItems.map((n) => {
                      const dot: Record<string, string> = { success: 'var(--accent)', error: 'var(--red)', warning: 'var(--orange)', info: 'var(--blue)' };
                      const dMsg   = (currentLang === 'zh' && n.msg_zh)   ? n.msg_zh   : n.msg;
                      const dTitle = (currentLang === 'zh' && n.title_zh) ? n.title_zh : n.title;
                      return (
                        <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', opacity: n.read ? 0.55 : 1, transition: 'opacity var(--transition)' }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: dot[n.type] || 'var(--blue)', flexShrink: 0, marginTop: 5 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {dTitle && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{dTitle}</div>}
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, wordBreak: 'break-word' }}>{dMsg}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{n.ts}</div>
                          </div>
                          <button onClick={() => dismissNotification(n.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                            <Icons.close size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* User */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                {(user as User)?.username}
              </span>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-dim)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {userInitial}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div style={{ flex: 1, overflow: 'auto', borderRadius: 'var(--radius)', background: 'var(--bg-base)', minHeight: 0 }}>
          <div style={{ padding: '20px 24px', minHeight: '100%' }}>
            {children}
          </div>
        </div>

      </div>

      {/* ─── RIGHT SIDEBAR (superadmin only, always mounted) ──────────────── */}
      {isSuperAdmin && (
        <div style={{ width: assistCollapsed ? 56 : 360, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, transition: 'width 0.25s ease', overflow: 'hidden' }}>

          {/* Right TB — mirrors Left TB brand block exactly */}
          <div
            style={{ ...tbSt, justifyContent: assistCollapsed ? 'center' : 'space-between', padding: assistCollapsed ? '0 6px' : '0 14px', cursor: assistCollapsed ? 'pointer' : 'default' }}
            onClick={assistCollapsed ? () => setAssistCollapsed(false) : undefined}
            title={assistCollapsed ? t('nav_hub_assist', 'HUB Assist') : undefined}
          >
            {assistCollapsed ? (
              <Icons.robot size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
            ) : (
              <>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t('nav_hub_assist', 'HUB Assist')}
                </span>
                <button
                  onClick={() => setAssistCollapsed(true)}
                  title="Collapse"
                  style={{ width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                >
                  <Icons.robot size={16} />
                </button>
              </>
            )}
          </div>

          {/* Right body — same style as left sidebar sections, always mounted */}
          <div style={{ ...secSt, flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {/* HubAssistPage hidden via display:none when collapsed — preserves all state */}
            <div style={{ display: assistCollapsed ? 'none' : 'flex', flexDirection: 'column', height: '100%' }}>
              <HubAssistPage panelMode onClose={() => setAssistCollapsed(true)} />
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default React.memo(AppLayout);
