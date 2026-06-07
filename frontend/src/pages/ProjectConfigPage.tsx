import React, { useState, useEffect } from 'react';
import { useI18nStore } from '@/stores/useI18nStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { configApi, userApi, teamApi } from '@/utils/api';
import { Icons } from '@/components/icons';
import type { User, Team } from '@/types';

type ConfigTab = 'identity' | 'overview' | 'teams' | 'users' | 'system' | 'audit';

const ProjectConfigPage: React.FC = () => {
  const { t } = useI18nStore();
  const { addToast } = useNotificationStore();

  const [activeTab, setActiveTab] = useState<ConfigTab>('identity');
  const [config, setConfig] = useState<Record<string, any>>({});
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [saving, setSaving] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Load data
  useEffect(() => {
    configApi.get().then((res) => setConfig(res.data.data || {})).catch(() => {});
    userApi.getAll().then((res) => setUsers(res.data.data || [])).catch(() => {});
    teamApi.getAll().then((res) => setTeams(res.data.data || [])).catch(() => {});
  }, []);

  const identity = config?.identity || {};
  const api = config?.api || {};

  // ─── Save config ─────────────────────────────────────────────
  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await configApi.save(config);
      addToast('Configuration saved', 'success');
    } catch {
      addToast('Failed to save', 'error');
    }
    setSaving(false);
  };

  // ─── User CRUD ───────────────────────────────────────────────
  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      await userApi.create({
        username: data.get('username'),
        email: data.get('email'),
        firstName: data.get('firstName'),
        lastName: data.get('lastName'),
        password: data.get('password'),
        role: data.get('role'),
        canViewActivity: data.get('canViewActivity') === 'on',
      });
      const res = await userApi.getAll();
      setUsers(res.data.data || []);
      setShowUserForm(false);
      addToast('User created', 'success');
    } catch (err: any) {
      addToast(err?.response?.data?.message || 'Failed to create user', 'error');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      await userApi.update(editingUser.id, {
        email: data.get('email'),
        firstName: data.get('firstName'),
        lastName: data.get('lastName'),
        role: data.get('role'),
        canViewActivity: data.get('canViewActivity') === 'on',
        isActive: data.get('isActive') !== 'off',
      });
      const res = await userApi.getAll();
      setUsers(res.data.data || []);
      setEditingUser(null);
      addToast('User updated', 'success');
    } catch (err: any) {
      addToast(err?.response?.data?.message || 'Failed to update user', 'error');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm('Deactivate this user?')) return;
    try {
      await userApi.delete(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      addToast('User deactivated', 'success');
    } catch {
      addToast('Failed to deactivate user', 'error');
    }
  };

  // ─── Update config field ─────────────────────────────────────
  const updateConfig = (section: string, field: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      [section]: { ...(prev[section] || {}), [field]: value },
    }));
  };

  // ─── Tabs ────────────────────────────────────────────────────
  const tabs: { id: ConfigTab; label: string; icon: keyof typeof Icons }[] = [
    { id: 'identity', label: t('cfg_tab_identity'), icon: 'cube' },
    { id: 'teams', label: t('cfg_tab_teams'), icon: 'users' },
    { id: 'users', label: t('cfg_tab_users'), icon: 'users' },
    { id: 'system', label: t('cfg_tab_system'), icon: 'server' },
  ];

  const roleColors: Record<string, { bg: string; text: string }> = {
    superadmin: { bg: 'var(--super-dim)', text: 'var(--super-admin)' },
    admin: { bg: 'var(--orange-dim)', text: 'var(--orange)' },
    viewer: { bg: 'var(--blue-dim)', text: 'var(--blue)' },
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
    fontSize: 13,
    outline: 'none',
    transition: 'border-color var(--transition)',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-muted)',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    marginBottom: 6,
    display: 'block',
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
            {t('cfg_page_title')}
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
            {t('cfg_page_subtitle')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, flexWrap: 'nowrap', marginBottom: 16, overflowX: 'auto' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '7px 14px', fontSize: 12, fontWeight: activeTab === tab.id ? 700 : 500,
              border: 'none', background: 'none', cursor: 'pointer',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              whiteSpace: 'nowrap', flexShrink: 0, transition: 'all var(--transition)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {React.createElement(Icons[tab.icon] || Icons.info, { size: 14 })}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Identity Tab ──────────────────────────────────────── */}
      {activeTab === 'identity' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Project Identity</h3>
            {[
              { key: 'name', label: 'Project Name' },
              { key: 'chip', label: 'Chip Model' },
              { key: 'version', label: 'Version' },
              { key: 'status', label: 'Status' },
              { key: 'description', label: 'Description' },
            ].map((field) => (
              <div key={field.key} style={{ marginBottom: 12 }}>
                <label style={labelStyle}>{field.label}</label>
                <input
                  type="text"
                  value={identity[field.key] || ''}
                  onChange={(e) => updateConfig('identity', field.key, e.target.value)}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Dates & Links</h3>
            {[
              { key: 'startDate', label: 'Start Date' },
              { key: 'targetDate', label: 'Target Date' },
              { key: 'githubUrl', label: 'GitHub URL' },
              { key: 'refLink1', label: 'Reference Link 1' },
              { key: 'refLink2', label: 'Reference Link 2' },
            ].map((field) => (
              <div key={field.key} style={{ marginBottom: 12 }}>
                <label style={labelStyle}>{field.label}</label>
                <input
                  type={field.key.includes('Date') ? 'date' : 'text'}
                  value={identity[field.key] || ''}
                  onChange={(e) => updateConfig('identity', field.key, e.target.value)}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              style={{
                padding: '10px 24px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)',
                color: 'var(--text-inverse)', border: 'none', fontSize: 13, fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Icons.save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* ─── Teams Tab ─────────────────────────────────────────── */}
      {activeTab === 'teams' && (
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Teams ({teams.length})</h3>
          </div>
          {teams.map((team) => (
            <div key={team.id} style={{
              display: 'flex', alignItems: 'center', padding: '12px 18px',
              borderBottom: '1px solid var(--border-subtle)', gap: 12,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--accent-dim)', color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>
                {React.createElement((Icons as any)[team.icon] || Icons.box, { size: 16 })}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {team.nameEn}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {team.nameZh} · ID: {team.teamId}
                </div>
              </div>
              <span style={{
                padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                background: team.isActive ? 'var(--accent-dim)' : 'var(--red-dim)',
                color: team.isActive ? 'var(--accent)' : 'var(--red)',
                textTransform: 'uppercase', letterSpacing: '0.3px',
              }}>
                {team.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ─── Users Tab ─────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button
              onClick={() => { setShowUserForm(true); setEditingUser(null); }}
              style={{
                padding: '8px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)',
                color: 'var(--text-inverse)', border: 'none', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Icons.plus size={14} /> Add User
            </button>
          </div>

          {/* User form */}
          {(showUserForm || editingUser) && (
            <div style={{
              background: 'var(--bg-overlay)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: 20, marginBottom: 16,
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
                {editingUser ? 'Edit User' : 'New User'}
              </h3>
              <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Username</label>
                  <input name="username" defaultValue={editingUser?.username || ''} readOnly={!!editingUser} style={{ ...inputStyle, ...(editingUser ? { opacity: 0.6 } : {}) }} />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input name="email" type="email" defaultValue={editingUser?.email || ''} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>First Name</label>
                  <input name="firstName" defaultValue={editingUser?.firstName || ''} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Last Name</label>
                  <input name="lastName" defaultValue={editingUser?.lastName || ''} style={inputStyle} />
                </div>
                {!editingUser && (
                  <div>
                    <label style={labelStyle}>Password</label>
                    <input name="password" type="password" style={inputStyle} />
                  </div>
                )}
                <div>
                  <label style={labelStyle}>Role</label>
                  <select name="role" defaultValue={editingUser?.role || 'viewer'} style={inputStyle}>
                    <option value="viewer">Viewer</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                  <input name="canViewActivity" type="checkbox" defaultChecked={editingUser?.canViewActivity || false} style={{ width: 'auto' }} />
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Can View Activity</label>
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => { setShowUserForm(false); setEditingUser(null); }}
                    style={{
                      padding: '8px 16px', borderRadius: 'var(--radius-sm)', background: 'none',
                      color: 'var(--text-secondary)', border: '1px solid var(--border)', fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '8px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)',
                      color: 'var(--text-inverse)', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {editingUser ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Users list */}
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            {users.map((u) => {
              const rc = roleColors[u.role] || roleColors.viewer;
              return (
                <div key={u.id} style={{
                  display: 'flex', alignItems: 'center', padding: '12px 18px',
                  borderBottom: '1px solid var(--border-subtle)', gap: 12,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--accent-dim)', color: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                  }}>
                    {(u.firstName?.[0] || u.username[0]).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {u.firstName} {u.lastName}
                      <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
                        @{u.username}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {u.email}
                    </div>
                  </div>
                  <span style={{
                    padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                    background: rc.bg, color: rc.text, textTransform: 'uppercase', letterSpacing: '0.3px',
                  }}>
                    {u.role}
                  </span>
                  <button
                    onClick={() => { setEditingUser(u); setShowUserForm(false); }}
                    style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', fontSize: 12 }}
                  >
                    <Icons.pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteUser(u.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12 }}
                  >
                    <Icons.trash size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── System Tab ────────────────────────────────────────── */}
      {activeTab === 'system' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14, maxWidth: 600 }}>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>API Settings</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Max Screenshots</label>
              <input
                type="number"
                value={api.maxScreenshots || 3}
                onChange={(e) => updateConfig('api', 'maxScreenshots', parseInt(e.target.value) || 3)}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Proxy URL</label>
              <input
                type="text"
                value={api.proxyUrl || ''}
                onChange={(e) => updateConfig('api', 'proxyUrl', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              style={{
                padding: '10px 24px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)',
                color: 'var(--text-inverse)', border: 'none', fontSize: 13, fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Icons.save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(ProjectConfigPage);
