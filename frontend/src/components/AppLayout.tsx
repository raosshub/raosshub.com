import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useI18nStore } from '@/stores/useI18nStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { teamApi } from '@/utils/api';
import type { Team, User } from '@/types';
import { Icons } from '@/components/icons';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { t, currentLang, setLanguage } = useI18nStore();
  const { theme, toggleTheme, sidebarCollapsed, toggleSidebar } = useThemeStore();
  const { addToast } = useNotificationStore();

  const [teams, setTeams] = useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);

  const isSuperAdmin = (user as User)?.role === 'superadmin';
  const isAdmin = isSuperAdmin || (user as User)?.role === 'admin';

  useEffect(() => {
    teamApi.getAll().then((res) => setTeams(res.data.data)).catch(() => {});
  }, []);

  const currentPath = location.pathname;

  const navItems = [
    { id: 'overview', label: t('nav_overview'), icon: 'overview', path: '/' },
  ];

  const teamNavItems = teams.map((team) => ({
    id: team.teamId,
    label: currentLang === 'zh' ? (team.nameZh || team.nameEn) : team.nameEn,
    icon: team.icon as keyof typeof Icons,
    path: `/team/${team.teamId}`,
  }));

  const toolItems = [
    ...(isSuperAdmin ? [{ id: 'assistant', label: t('tool_hub_assist'), icon: 'robot' as const, path: '/assistant' }] : []),
    ...(isAdmin ? [{ id: 'activitylog', label: t('tool_activity_log'), icon: 'clock' as const, path: '/activity-log' }] : []),
    { id: 'settings', label: t('nav_settings'), icon: 'settings', path: '/settings' },
  ];

  const handleNavClick = (path: string) => navigate(path);

  const filteredNav = [...navItems, ...teamNavItems].filter(
    (item) => !searchQuery || item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const IconComp = (name: keyof typeof Icons, size = 18) => {
    const C = Icons[name];
    return C ? <C size={size} /> : null;
  };

  const userInitial = user?.firstName?.[0] || user?.username?.[0]?.toUpperCase() || '?';

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg-base)',
        padding: 10,
        gap: 10,
        boxSizing: 'border-box',
      }}
    >
      {/* ─── SIDEBAR ─────────────────────────────────────────── */}
      <aside
        style={{
          width: sidebarCollapsed ? 56 : 248,
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          gap: 10,
          transition: 'width 0.25s ease',
          overflow: 'hidden',
          position: 'relative',
          background: 'transparent',
        }}
      >
        {/* Brand block */}
        <div
          style={{
            background: 'var(--bg-base)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            flexShrink: 0,
            height: 56,
            display: 'flex',
            alignItems: 'center',
            padding: sidebarCollapsed ? '0 6px' : '0 14px',
            overflow: 'hidden',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              overflow: 'hidden',
              background: 'var(--bg-overlay)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
              fontWeight: 700,
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            R
          </div>
          {!sidebarCollapsed && (
            <div style={{ marginLeft: 11, overflow: 'hidden', transition: 'opacity 0.2s ease' }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: 1.3,
                }}
              >
                RAOSS Hub
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--accent)',
                  fontWeight: 600,
                  letterSpacing: '0.3px',
                  whiteSpace: 'nowrap',
                }}
              >
                v3.0
              </div>
            </div>
          )}
        </div>

        {/* Nav block */}
        <div
          style={{
            flex: 1,
            background: 'var(--sidebar-bg)',
            border: '1px solid var(--sidebar-border)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          {/* Search + toggle */}
          <div
            style={{
              padding: '8px 8px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0,
            }}
          >
            <button
              onClick={toggleSidebar}
              style={{
                flexShrink: 0,
                width: 28,
                height: 28,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'all var(--transition)',
              }}
              title="Toggle sidebar"
            >
              <Icons.menu size={16} />
            </button>
            {!sidebarCollapsed && (
              <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', minWidth: 0 }}>
                <span style={{ position: 'absolute', left: 8, color: 'var(--text-muted)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                  <Icons.search size={12} />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  style={{
                    width: '100%',
                    padding: '6px 8px 6px 28px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: 12,
                    outline: 'none',
                    transition: 'border-color var(--transition)',
                  }}
                />
              </div>
            )}
          </div>

          {/* Nav items */}
          <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0', minHeight: 0 }}>
            {/* Overview */}
            {filteredNav
              .filter((item) => item.id === 'overview')
              .map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: sidebarCollapsed ? '8px' : '8px 16px',
                    margin: '1px 6px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    color: currentPath === item.path ? 'var(--accent)' : 'var(--text-secondary)',
                    background: currentPath === item.path ? 'var(--accent-dim)' : 'transparent',
                    border: 'none',
                    width: sidebarCollapsed ? 'calc(100% - 12px)' : 'calc(100% - 12px)',
                    transition: 'all var(--transition)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    position: 'relative',
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  }}
                >
                  {currentPath === item.path && (
                    <span
                      style={{
                        content: '',
                        position: 'absolute',
                        left: 0,
                        top: '25%',
                        bottom: '25%',
                        width: 3,
                        background: 'var(--accent)',
                        borderRadius: '0 3px 3px 0',
                      }}
                    />
                  )}
                  <span style={{ width: 18, height: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {IconComp(item.icon as keyof typeof Icons)}
                  </span>
                  {!sidebarCollapsed && (
                    <span style={{ fontSize: 13, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </span>
                  )}
                </button>
              ))}

            {/* Teams group */}
            {teamNavItems.length > 0 && !sidebarCollapsed && (
              <div
                style={{
                  padding: '10px 16px 4px',
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                {t('nav_teams_group')}
              </div>
            )}

            {filteredNav
              .filter((item) => item.id !== 'overview')
              .map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: sidebarCollapsed ? '8px' : '8px 16px',
                    margin: '1px 6px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    color: currentPath === item.path ? 'var(--accent)' : 'var(--text-secondary)',
                    background: currentPath === item.path ? 'var(--accent-dim)' : 'transparent',
                    border: 'none',
                    width: sidebarCollapsed ? 'calc(100% - 12px)' : 'calc(100% - 12px)',
                    transition: 'all var(--transition)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    position: 'relative',
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  }}
                >
                  {currentPath === item.path && (
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '25%',
                        bottom: '25%',
                        width: 3,
                        background: 'var(--accent)',
                        borderRadius: '0 3px 3px 0',
                      }}
                    />
                  )}
                  <span style={{ width: 18, height: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {IconComp(item.icon as keyof typeof Icons)}
                  </span>
                  {!sidebarCollapsed && (
                    <span style={{ fontSize: 13, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </span>
                  )}
                </button>
              ))}
          </nav>
        </div>

        {/* Tools block */}
        <div
          style={{
            flexShrink: 0,
            background: 'var(--sidebar-bg)',
            border: '1px solid var(--sidebar-border)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
          }}
        >
          {toolItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: sidebarCollapsed ? '8px' : '8px 10px',
                margin: '1px 6px',
                borderRadius: 'var(--radius-sm)',
                color: currentPath === item.path ? 'var(--accent)' : 'var(--text-secondary)',
                background: currentPath === item.path ? 'var(--accent-dim)' : 'transparent',
                border: 'none',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all var(--transition)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              }}
            >
              <span style={{ width: 20, height: 20, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {IconComp(item.icon as keyof typeof Icons)}
              </span>
              {!sidebarCollapsed && (
                <span style={{ transition: 'opacity 0.2s' }}>{item.label}</span>
              )}
            </button>
          ))}

          {/* Logout */}
          <button
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: sidebarCollapsed ? '8px' : '8px 10px',
              margin: '1px 6px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              background: 'transparent',
              border: 'none',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all var(--transition)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--red-dim)';
              e.currentTarget.style.color = 'var(--red)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <span style={{ width: 20, height: 20, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icons.logout size={16} />
            </span>
            {!sidebarCollapsed && <span>{t('tool_sign_out')}</span>}
          </button>
        </div>

        {/* Footer block */}
        {!sidebarCollapsed && (
          <div
            style={{
              flexShrink: 0,
              padding: '8px 14px 10px',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>v3.0</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>© 2026 RAOSS</div>
          </div>
        )}
      </aside>

      {/* ─── MAIN AREA ───────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
          gap: 10,
        }}
      >
        {/* Topbar */}
        <header
          style={{
            height: 56,
            background: 'var(--topbar-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            flexShrink: 0,
            position: 'relative',
            overflow: 'visible',
            zIndex: 300,
          }}
        >
          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.2px' }}>
              HUB Dashboard
            </span>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.3px',
                background: 'var(--accent-dim)',
                color: 'var(--accent)',
                border: '1px solid rgba(63,185,80,0.25)',
              }}
            >
              In Development
            </span>
          </div>

          {/* Center - empty */}
          <div style={{ flex: 1 }} />

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {/* Lang toggle */}
            <button
              onClick={() => setLanguage(currentLang === 'en' ? 'zh' : 'en')}
              style={{
                padding: '4px 12px',
                borderRadius: 99,
                border: '1px solid var(--border)',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                background: 'var(--bg-overlay)',
                cursor: 'pointer',
              }}
            >
              {currentLang === 'en' ? '中文' : 'English'}
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              style={{
                width: 34,
                height: 34,
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                background: 'none',
                border: '1px solid var(--border)',
                cursor: 'pointer',
              }}
            >
              {theme === 'dark' ? <Icons.sun size={16} /> : <Icons.moon size={16} />}
            </button>

            {/* User */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'var(--accent-dim)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {userInitial}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                {user?.firstName || user?.username}
              </span>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main
          style={{
            flex: 1,
            overflow: 'hidden',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default React.memo(AppLayout);
