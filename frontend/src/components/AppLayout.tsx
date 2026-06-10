import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore }            from '@/stores/useAuthStore';
import { useI18nStore }            from '@/stores/useI18nStore';
import { useThemeStore }           from '@/stores/useThemeStore';
import { useConfigStore }          from '@/stores/useConfigStore';
import { useNotificationStore }    from '@/stores/useNotificationStore';
import { teamApi }                 from '@/utils/api';
import type { Team, User }         from '@/types';
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
  const { t, currentLang, setLanguage, languages } = useI18nStore();
  const { theme, toggleTheme, sidebarCollapsed, toggleSidebar } = useThemeStore();
  const { identity, notifications, loaded, load, getBreadcrumb } = useConfigStore();

  const [teams, setTeams]             = React.useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [trayOpen, setTrayOpen]       = React.useState(false);
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
  const breadcrumb  = getBreadcrumb(currentPath);
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
      <button onClick={() => navigate(path)} title={sidebarCollapsed ? label : undefined}
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

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-base)', padding: 10, gap: 10, boxSizing: 'border-box' }}>

      {/* ─── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside style={{ width: sidebarCollapsed ? 56 : 248, display: 'flex', flexDirection: 'column', flexShrink: 0, gap: 10, transition: 'width 0.25s ease', overflow: 'hidden' }}>

        {/* Brand block */}
        <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', flexShrink: 0, minHeight: 56, display: 'flex', alignItems: 'center', padding: sidebarCollapsed ? '0 6px' : '0 14px', overflow: 'hidden', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', background: identity.logoUrl ? 'transparent' : 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontWeight: 700, fontSize: 16, flexShrink: 0, border: identity.logoUrl ? 'none' : '1px dashed var(--border)' }}>
            {identity.logoUrl
              ? <img src={identity.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <span>{(identity.projectName || 'R')[0]}</span>}
          </div>
          {!sidebarCollapsed && (
            <div style={{ marginLeft: 11, overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                {identity.projectName || 'RAOSS Hub'}
              </div>
              {identity.productCode && (
                <div style={{ fontSize: 10, color: identity.primaryColor || 'var(--accent)', fontWeight: 600, letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
                  {identity.productCode}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nav block */}
        <div style={{ flex: 1, background: 'var(--sidebar-bg)', border: '1px solid var(--sidebar-border)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 8px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
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

          <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
            {filteredMain.map((item) => <NavItem key={item.id} {...item} />)}
            {teamNavItems.length > 0 && (
              <>
                {!sidebarCollapsed && <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', padding: '10px 10px 4px' }}>{t('nav_teams_group') || 'Teams'}</div>}
                {teamNavItems.map((item) => <NavItem key={item.id} {...item} />)}
              </>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', padding: 6, flexShrink: 0 }}>
            <UtilButton icon="sun" label={theme === 'dark' ? (t('tool_theme_light') || 'Light Mode') : (t('tool_theme_dark') || 'Dark Mode')} onClick={toggleTheme} />
            {isSuperAdmin && <UtilButton icon="robot"    label={t('tool_hub_assist') || 'HUB Assist'}   onClick={() => navigate('/assistant')}    accent  active={currentPath === '/assistant'} />}
            {isAdmin      && <UtilButton icon="clock"    label={t('tool_activity_log') || 'Activity Log'} onClick={() => navigate('/activity-log')}  active={currentPath === '/activity-log'} />}
            {isSuperAdmin && <UtilButton icon="shield"   label={t('tool_admin_setup') || 'Admin Setup'}       onClick={() => navigate('/admin/setup')}   active={currentPath.startsWith('/admin')} />}
            <UtilButton icon="settings" label={t('nav_settings') || 'Settings'} onClick={() => navigate('/settings')} active={currentPath === '/settings'} />
            <UtilButton icon="logOut"   label={t('tool_sign_out') || 'Sign Out'} onClick={logout} danger />
          </div>
        </div>

        {/* Footer — Line 1: Document Version (gated by Tab 6 showVersion toggle) */}
        {!sidebarCollapsed && notifications?.showVersion !== false && identity.version && (
          <div style={{ background: 'var(--sidebar-bg)', border: '1px solid var(--sidebar-border)', borderRadius: 'var(--radius)', padding: '8px 14px', flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', opacity: 0.9 }}>
              {t('version_prefix', 'Document Version')} {identity.version}
            </div>
          </div>
        )}

        {/* Footer — Lines 2-5: IP notices */}
        {!sidebarCollapsed && (identity.icpZh || identity.icpEn || identity.patentNotice || identity.trademarkNotice || identity.copyrightNotice || identity.companyName) && (
          <div style={{ background: 'var(--sidebar-bg)', border: '1px solid var(--sidebar-border)', borderRadius: 'var(--radius)', padding: '10px 14px', flexShrink: 0 }}>
            {icpLine           && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, opacity: 0.8 }}>{icpLine}</div>}
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

      {/* ─── MAIN ─────────────────────────────────────────────────────────── */}
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

            {/* Theme toggle */}
            <button onClick={toggleTheme} style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
              {theme === 'dark' ? <Icons.sun size={16} /> : <Icons.moon size={16} />}
            </button>

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
                {(user as User)?.firstName || (user as User)?.username}
              </span>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-dim)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {userInitial}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div style={{ flex: 1, overflow: 'auto', borderRadius: 'var(--radius)', background: 'var(--bg-base)' }}>
          <div style={{ padding: '20px 24px', minHeight: '100%' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(AppLayout);
