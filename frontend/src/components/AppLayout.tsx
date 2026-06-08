import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useI18nStore } from '@/stores/useI18nStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useConfigStore } from '@/stores/useConfigStore';
import { teamApi } from '@/utils/api';
import type { Team, User } from '@/types';
import { Icons } from '@/components/icons';
import { STATUS_OPTIONS, getStatusLabel } from '@/types';

// Status → badge colour map (value matches STATUS_OPTIONS values)
const STATUS_COLORS: Record<string, string> = {
  planning:    '#6b7280',
  development: '#3b82f6',
  prototype:   '#f59e0b',
  production:  '#10b981',
  maintenance: '#8b5cf6',
  completed:   '#059669',
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { user, logout }                    = useAuthStore();
  const { t, currentLang, setLanguage }     = useI18nStore();
  const { theme, toggleTheme, sidebarCollapsed, toggleSidebar } = useThemeStore();
  const { identity, loaded, load, getBreadcrumb } = useConfigStore();

  const [teams, setTeams]           = React.useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');

  const isSuperAdmin = (user as User)?.role === 'superadmin';
  const isAdmin      = isSuperAdmin || (user as User)?.role === 'admin';
  const isZh         = currentLang === 'zh';

  // Load config + teams on mount
  useEffect(() => {
    load();
    teamApi.getAll()
      .then((res) => setTeams(res.data.data))
      .catch(() => {});
  }, [load]);

  const currentPath = location.pathname;
  const breadcrumb  = getBreadcrumb(currentPath);

  // ── Status badge ──────────────────────────────────────────────────────────
  const statusText  = identity.status
    ? getStatusLabel(identity.status, currentLang)
    : '';
  const statusColor = STATUS_COLORS[identity.status] || identity.primaryColor || 'var(--accent)';

  // ── Sidebar footer — lines 2-5 (line 1 = version, coming later) ──────────
  // Line 2: ICP — ZH version when lang = zh, EN version for all other languages
  const icpLine = isZh ? identity.icpZh : identity.icpEn;

  // ── Nav items ─────────────────────────────────────────────────────────────
  const mainNavItems = [
    { id: 'overview', label: t('nav_overview'), icon: 'overview' as const, path: '/' },
  ];

  const teamNavItems = teams
    .filter((team) => !searchQuery || (isZh ? team.nameZh : team.nameEn).toLowerCase().includes(searchQuery.toLowerCase()))
    .map((team) => ({
      id:   team.teamId,
      label: isZh ? (team.nameZh || team.nameEn) : team.nameEn,
      icon: (team.icon as keyof typeof Icons) || 'package',
      path: `/team/${team.teamId}`,
    }));

  const filteredMain = !searchQuery
    ? mainNavItems
    : mainNavItems.filter((i) => i.label.toLowerCase().includes(searchQuery.toLowerCase()));

  const userInitial = (user as User)?.firstName?.[0] || (user as User)?.username?.[0]?.toUpperCase() || '?';

  function NavItem({ id, label, icon, path }: { id: string; label: string; icon: keyof typeof Icons; path: string }) {
    const active  = currentPath === path || (path !== '/' && currentPath.startsWith(path));
    const IconComp = Icons[icon];
    return (
      <button
        key={id}
        onClick={() => navigate(path)}
        title={sidebarCollapsed ? label : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: sidebarCollapsed ? '9px 6px' : '8px 10px',
          borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
          width: '100%', textAlign: 'left',
          background: active ? 'var(--bg-active)' : 'transparent',
          color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          transition: 'all var(--transition)',
        }}
      >
        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', color: active ? 'var(--accent)' : 'inherit' }}>
          {IconComp && <IconComp size={16} />}
        </span>
        {!sidebarCollapsed && (
          <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {label}
          </span>
        )}
      </button>
    );
  }

  function UtilButton({ icon, label: btnLabel, onClick, accent, danger, active: isActive }: {
    icon: keyof typeof Icons; label: string; onClick: () => void;
    accent?: boolean; danger?: boolean; active?: boolean;
  }) {
    const IconComp = Icons[icon];
    return (
      <button
        onClick={onClick}
        title={sidebarCollapsed ? btnLabel : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: sidebarCollapsed ? '8px 6px' : '8px 10px',
          borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
          width: '100%', textAlign: 'left',
          background: isActive ? 'var(--bg-active)' : 'transparent',
          color: accent ? 'var(--accent)' : danger ? 'var(--red)' : 'var(--text-secondary)',
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          transition: 'all var(--transition)',
        }}
      >
        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          {IconComp && <IconComp size={16} />}
        </span>
        {!sidebarCollapsed && (
          <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
            {btnLabel}
          </span>
        )}
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-base)', padding: 10, gap: 10, boxSizing: 'border-box' }}>

      {/* ─── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside style={{ width: sidebarCollapsed ? 56 : 248, display: 'flex', flexDirection: 'column', flexShrink: 0, gap: 10, transition: 'width 0.25s ease', overflow: 'hidden', position: 'relative', background: 'transparent' }}>

        {/* Brand block */}
        <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', flexShrink: 0, minHeight: 56, display: 'flex', alignItems: 'center', padding: sidebarCollapsed ? '0 6px' : '0 14px', overflow: 'hidden', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
          {/* Logo */}
          <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', background: identity.logoUrl ? 'transparent' : 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontWeight: 700, fontSize: 16, flexShrink: 0, border: identity.logoUrl ? 'none' : '1px dashed var(--border)' }}>
            {identity.logoUrl
              ? <img src={identity.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <span>{(identity.projectName || 'R')[0]}</span>}
          </div>
          {!sidebarCollapsed && (
            <div style={{ marginLeft: 11, overflow: 'hidden', transition: 'opacity 0.2s ease' }}>
              {/* Line 1: Project Name */}
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                {identity.projectName || 'RAOSS Hub'}
              </div>
              {/* Line 2: Product Code — rendered in Primary Color */}
              {identity.productCode && (
                <div style={{ fontSize: 10, color: identity.primaryColor || 'var(--accent)', fontWeight: 600, letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
                  {identity.productCode}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nav block — search + nav items */}
        <div style={{ flex: 1, background: 'var(--sidebar-bg)', border: '1px solid var(--sidebar-border)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>

          {/* Search + sidebar toggle row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 8px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
            <button
              onClick={toggleSidebar}
              style={{ width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Icons.menu size={16} />
            </button>
            {!sidebarCollapsed && (
              <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: 8, color: 'var(--text-muted)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                  <Icons.search size={12} />
                </span>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('search_placeholder') || 'Search…'}
                  style={{ width: '100%', padding: '5px 8px 5px 26px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 12, outline: 'none' }}
                />
              </div>
            )}
          </div>

          {/* Nav items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
            {/* Main nav */}
            {filteredMain.map((item) => (
              <NavItem key={item.id} {...item} />
            ))}

            {/* Teams group */}
            {teamNavItems.length > 0 && (
              <>
                {!sidebarCollapsed && (
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', padding: '10px 10px 4px' }}>
                    {t('nav_teams_group') || 'Teams'}
                  </div>
                )}
                {teamNavItems.map((item) => (
                  <NavItem key={item.id} {...item} />
                ))}
              </>
            )}
          </div>

          {/* Utility buttons */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', padding: 6, flexShrink: 0 }}>
            <UtilButton icon="sun" label={t(theme === 'dark' ? 'tool_theme_light' : 'tool_theme_dark') || (theme === 'dark' ? 'Light Mode' : 'Dark Mode')} onClick={toggleTheme} />
            {isSuperAdmin && (
              <UtilButton icon="robot" label={t('tool_hub_assist') || 'HUB Assist'} onClick={() => navigate('/assistant')} accent active={currentPath === '/assistant'} />
            )}
            {isAdmin && (
              <UtilButton icon="clock" label={t('tool_activity_log') || 'Activity Log'} onClick={() => navigate('/activity-log')} active={currentPath === '/activity-log'} />
            )}
            {isSuperAdmin && (
              <UtilButton icon="shield" label={isZh ? '管理设置' : 'Admin Setup'} onClick={() => navigate('/admin/setup')} active={currentPath.startsWith('/admin')} />
            )}
            <UtilButton icon="settings" label={t('nav_settings') || 'Settings'} onClick={() => navigate('/settings')} active={currentPath === '/settings'} />
            <UtilButton icon="logOut" label={t('tool_sign_out') || 'Sign Out'} onClick={logout} danger />
          </div>
        </div>

        {/* Footer block — IP / compliance lines 2-5 */}
        {!sidebarCollapsed && (
          <div style={{ background: 'var(--sidebar-bg)', border: '1px solid var(--sidebar-border)', borderRadius: 'var(--radius)', padding: '10px 14px', flexShrink: 0 }}>
            {/* Line 1: Version — placeholder until version control is built */}
            {/* Line 2: ICP — conditional on active language */}
            {icpLine && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, opacity: 0.8 }}>{icpLine}</div>
            )}
            {/* Line 3: Patent Notice */}
            {identity.patentNotice && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, opacity: 0.8 }}>{identity.patentNotice}</div>
            )}
            {/* Line 4: Trademark Notice */}
            {identity.trademarkNotice && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, opacity: 0.8 }}>{identity.trademarkNotice}</div>
            )}
            {/* Line 5: Copyright Notice */}
            {(identity.copyrightNotice || identity.companyName) && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.8 }}>
                {identity.copyrightNotice || `© ${new Date().getFullYear()} ${identity.companyName}`}
              </div>
            )}
          </div>
        )}

      </aside>

      {/* ─── MAIN AREA ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, gap: 10 }}>

        {/* Topbar */}
        <header style={{ height: 56, background: 'var(--topbar-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', padding: '0 16px', flexShrink: 0, position: 'relative', overflow: 'visible', zIndex: 300 }}>

          {/* Left: Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.2px', whiteSpace: 'nowrap' }}>
              {breadcrumb}
            </span>
          </div>

          {/* Centre: Status badge — translated via getStatusLabel */}
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center' }}>
            {statusText && (
              <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, letterSpacing: '0.3px', textTransform: 'uppercase', background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}40` }}>
                {statusText}
              </span>
            )}
          </div>

          {/* Right: controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexShrink: 0 }}>
            {/* Language toggle */}
            <button
              onClick={() => setLanguage(currentLang === 'en' ? 'zh' : 'en')}
              style={{ padding: '4px 12px', borderRadius: 99, border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-overlay)', cursor: 'pointer' }}
            >
              {currentLang === 'en' ? '中文' : 'EN'}
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
              title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
            >
              {theme === 'dark' ? <Icons.sun size={16} /> : <Icons.moon size={16} />}
            </button>

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

export default AppLayout;
