import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useConfigStore } from '@/stores/useConfigStore';
import { configApi } from '@/utils/api';
import { Icons } from '@/components/icons';
import ProjectIdentityTab, { type ProjectIdentityTabHandle } from './ProjectIdentityTab';

type SetupTab = 'identity' | 'appearance' | 'notifications' | 'integrations';

const TABS: { id: SetupTab; label: string; icon: keyof typeof Icons; description: string }[] = [
  { id: 'identity', label: 'Project Identity & Branding', icon: 'cube', description: 'Name, branding, product visuals, contact, IP notices' },
  { id: 'appearance', label: 'Appearance', icon: 'monitor', description: 'Theme colors, layout, and visual customization' },
  { id: 'notifications', label: 'Notifications', icon: 'bell', description: 'Email alerts, webhooks, and notification rules' },
  { id: 'integrations', label: 'Integrations', icon: 'link', description: 'API keys, third-party services, and webhooks' },
];

function renderIcon(name: keyof typeof Icons, size = 16) {
  const C = Icons[name];
  return C ? <C size={size} /> : null;
}

/* ─── Generic tab wrapper — keeps all tabs mounted for state persistence ─── */
function TabPanel({ children, active }: { children: React.ReactNode; active: boolean }) {
  return (
    <div style={{ display: active ? 'block' : 'none' }}>
      {children}
    </div>
  );
}

export default function AdminSetupPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = (user as any)?.role === 'superadmin';

  const [activeTab, setActiveTab] = useState<SetupTab>('identity');
  const [globalHasChanges, setGlobalHasChanges] = useState(false);
  const [globalSaving, setGlobalSaving] = useState(false);

  // Track per-tab hasChanges
  const tabChangesRef = useRef<Record<string, boolean>>({});

  // Tab refs for save/reset/getData
  const identityTabRef = useRef<ProjectIdentityTabHandle>(null);

  // ─── Unsaved changes warning ──────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (globalHasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [globalHasChanges]);

  // ─── Collect hasChanges from all tabs ─────────────────────
  const updateTabChanges = useCallback((tabId: string, hasChanges: boolean) => {
    tabChangesRef.current[tabId] = hasChanges;
    const anyChanges = Object.values(tabChangesRef.current).some(Boolean);
    setGlobalHasChanges(anyChanges);
  }, []);

  // ─── Global Save — collects data from ALL tabs ────────────
  const handleSave = useCallback(async () => {
    setGlobalSaving(true);
    try {
      // Collect data from identity tab
      const identityData = identityTabRef.current?.getData?.() || {};

      // Build unified payload — each tab's data under its key
      const payload: Record<string, unknown> = {};
      if (identityData && Object.keys(identityData).length > 0) {
        payload.identity = identityData;
      }

      // Send to backend — merges with existing config
      await configApi.save(payload);

      // Refresh global store
      useConfigStore.getState().load();

      // Mark all tabs as saved
      tabChangesRef.current = {};
      setGlobalHasChanges(false);
    } catch (err: any) {
      console.error('[Save] Failed:', err);
    }
    setGlobalSaving(false);
  }, []);

  // ─── Global Reset ─────────────────────────────────────────
  const handleReset = useCallback(() => {
    if (!window.confirm('Reset all settings to defaults? This cannot be undone.')) return;
    identityTabRef.current?.reset();
  }, []);

  if (!isSuperAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--red-dim)', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icons.shield size={28} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Access Denied</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 400 }}>Only Super Admin users can access the Admin Setup page.</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: 960 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Admin Setup</h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>Configure your hub settings. These affect how the hub appears to all users.</p>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* Left: Sticky nav + Save buttons */}
        <div style={{ width: 240, flexShrink: 0, position: 'sticky', top: 0, alignSelf: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 14px', borderRadius: 'var(--radius-sm)',
                  border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                  background: activeTab === tab.id ? 'var(--accent-dim)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
                  transition: 'all var(--transition)',
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: activeTab === tab.id ? 'var(--accent)' : 'var(--bg-elevated)',
                  color: activeTab === tab.id ? 'var(--text-inverse)' : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {renderIcon(tab.icon, 16)}
                </div>
                <div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: activeTab === tab.id ? 700 : 600,
                    color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    marginBottom: 2,
                  }}>
                    {tab.label}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4 }}>{tab.description}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Save/Reset buttons — visible for ALL tabs */}
          <div style={{
            marginTop: 16, padding: '14px 12px',
            background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{
              fontSize: 11,
              color: globalHasChanges ? 'var(--orange)' : 'var(--text-muted)',
              fontWeight: 600,
            }}>
              {globalSaving ? 'Saving...' : globalHasChanges ? 'Unsaved changes' : 'All saved'}
            </div>
            <button
              onClick={handleSave}
              disabled={globalSaving || !globalHasChanges}
              style={{
                padding: '10px 16px', borderRadius: 'var(--radius-sm)',
                background: 'var(--accent)', color: 'var(--text-inverse)',
                border: 'none', fontSize: 13, fontWeight: 600,
                cursor: globalSaving || !globalHasChanges ? 'not-allowed' : 'pointer',
                opacity: globalSaving || !globalHasChanges ? 0.6 : 1,
              }}
            >
              {globalSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleReset}
              style={{
                padding: '8px 16px', borderRadius: 'var(--radius-sm)',
                background: 'none', color: 'var(--text-secondary)',
                border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Reset to Default
            </button>
          </div>
        </div>

        {/* Right: Content — ALL tabs mounted, only active visible */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <TabPanel active={activeTab === 'identity'}>
            <ProjectIdentityTab
              ref={identityTabRef}
              onStateChange={(hc: boolean) => updateTabChanges('identity', hc)}
            />
          </TabPanel>
          <TabPanel active={activeTab === 'appearance'}>
            <AppearanceTab onStateChange={(hc: boolean) => updateTabChanges('appearance', hc)} />
          </TabPanel>
          <TabPanel active={activeTab === 'notifications'}>
            <NotificationsTab onStateChange={(hc: boolean) => updateTabChanges('notifications', hc)} />
          </TabPanel>
          <TabPanel active={activeTab === 'integrations'}>
            <IntegrationsTab onStateChange={(hc: boolean) => updateTabChanges('integrations', hc)} />
          </TabPanel>
        </div>

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   APPEARANCE TAB
   ═══════════════════════════════════════════════════════════════ */
function AppearanceTab({ onStateChange }: { onStateChange?: (hasChanges: boolean) => void }) {
  const [theme, setTheme] = useState('dark');
  const [radius, setRadius] = useState('medium');
  const [animations, setAnimations] = useState(true);

  React.useEffect(() => {
    onStateChange?.(true);
  }, [theme, radius, animations, onStateChange]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Appearance</h2>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Customize the visual look and feel of your hub.</p>
      </div>
      <div style={{ display: 'grid', gap: 14 }}>
        <AdminCard title="Theme" accent="var(--accent)">
          <div style={{ display: 'flex', gap: 12 }}>
            {['dark', 'light'].map((t) => (
              <button key={t} onClick={() => setTheme(t)} style={{
                flex: 1, padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                border: theme === t ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: theme === t ? 'var(--accent-dim)' : 'var(--bg-base)',
                color: theme === t ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: 600, fontSize: 13, cursor: 'pointer', textTransform: 'capitalize',
              }}>
                {t} Mode
              </button>
            ))}
          </div>
        </AdminCard>
        <AdminCard title="Border Radius" accent="var(--orange)">
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { key: 'small', label: 'Sharp', desc: '2px corners' },
              { key: 'medium', label: 'Rounded', desc: '8px corners' },
              { key: 'large', label: 'Soft', desc: '16px corners' },
            ].map((r) => (
              <button key={r.key} onClick={() => setRadius(r.key)} style={{
                flex: 1, padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                border: radius === r.key ? '2px solid var(--orange)' : '1px solid var(--border)',
                background: radius === r.key ? 'var(--orange-dim)' : 'var(--bg-base)',
                color: radius === r.key ? 'var(--orange)' : 'var(--text-secondary)',
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}>
                <div>{r.label}</div>
                <div style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>{r.desc}</div>
              </button>
            ))}
          </div>
        </AdminCard>
        <AdminCard title="Animations" accent="var(--green)">
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={animations} onChange={(e) => setAnimations(e.target.checked)} style={{ width: 18, height: 18 }} />
            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>Enable UI animations and transitions</span>
          </label>
        </AdminCard>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NOTIFICATIONS TAB
   ═══════════════════════════════════════════════════════════════ */
function NotificationsTab({ onStateChange }: { onStateChange?: (hasChanges: boolean) => void }) {
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [smtpHost, setSmtpHost] = useState('localhost');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [notifyUpload, setNotifyUpload] = useState(true);
  const [notifyLogin, setNotifyLogin] = useState(false);

  React.useEffect(() => {
    onStateChange?.(true);
  }, [emailEnabled, smtpHost, smtpPort, smtpUser, smtpPass, notifyUpload, notifyLogin, onStateChange]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Notifications</h2>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Configure email alerts and notification rules.</p>
      </div>
      <div style={{ display: 'grid', gap: 14 }}>
        <AdminCard title="Email Notifications" accent="var(--accent)">
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 16 }}>
            <input type="checkbox" checked={emailEnabled} onChange={(e) => setEmailEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>Enable email notifications</span>
          </label>
          {emailEnabled && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <AdminField label="SMTP Host" value={smtpHost} onChange={setSmtpHost} placeholder="smtp.gmail.com" />
              <AdminField label="SMTP Port" value={smtpPort} onChange={setSmtpPort} placeholder="587" />
              <AdminField label="SMTP Username" value={smtpUser} onChange={setSmtpUser} placeholder="user@company.com" />
              <AdminField label="SMTP Password" value={smtpPass} onChange={setSmtpPass} placeholder="••••••••" type="password" />
            </div>
          )}
        </AdminCard>
        <AdminCard title="Notification Rules" accent="var(--orange)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={notifyUpload} onChange={(e) => setNotifyUpload(e.target.checked)} style={{ width: 18, height: 18 }} />
              <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>Notify on file uploads</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={notifyLogin} onChange={(e) => setNotifyLogin(e.target.checked)} style={{ width: 18, height: 18 }} />
              <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>Notify on user login</span>
            </label>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   INTEGRATIONS TAB
   ═══════════════════════════════════════════════════════════════ */
function IntegrationsTab({ onStateChange }: { onStateChange?: (hasChanges: boolean) => void }) {
  const [kimiKey, setKimiKey] = useState('');
  const [kimiUrl, setKimiUrl] = useState('https://api.moonshot.cn/v1');
  const [proxyUrl, setProxyUrl] = useState('');
  const [s3Endpoint, setS3Endpoint] = useState('http://localhost:9000');
  const [s3AccessKey, setS3AccessKey] = useState('raossminio');
  const [s3SecretKey, setS3SecretKey] = useState('raossminio2024');

  React.useEffect(() => {
    onStateChange?.(true);
  }, [kimiKey, kimiUrl, proxyUrl, s3Endpoint, s3AccessKey, s3SecretKey, onStateChange]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Integrations</h2>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Configure third-party service connections.</p>
      </div>
      <div style={{ display: 'grid', gap: 14 }}>
        <AdminCard title="Moonshot AI (Kimi)" accent="var(--purple)">
          <AdminField label="API Key" value={kimiKey} onChange={setKimiKey} placeholder="sk-..." />
          <div style={{ marginTop: 10 }}>
            <AdminField label="Base URL" value={kimiUrl} onChange={setKimiUrl} placeholder="https://api.moonshot.cn/v1" />
          </div>
        </AdminCard>
        <AdminCard title="Proxy" accent="var(--blue)">
          <AdminField label="Proxy URL" value={proxyUrl} onChange={setProxyUrl} placeholder="http://localhost:3001" />
        </AdminCard>
        <AdminCard title="MinIO / S3 Storage" accent="var(--green)">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <AdminField label="Endpoint" value={s3Endpoint} onChange={setS3Endpoint} placeholder="http://localhost:9000" />
            <AdminField label="Access Key" value={s3AccessKey} onChange={setS3AccessKey} placeholder="access-key" />
            <AdminField label="Secret Key" value={s3SecretKey} onChange={setS3SecretKey} placeholder="secret-key" type="password" />
          </div>
        </AdminCard>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SHARED SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

function AdminCard({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: 20,
    }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 4, height: 16, background: accent, borderRadius: 2 }} />
        {title}
      </h3>
      {children}
    </div>
  );
}

function AdminField({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{
        fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
        letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 6, display: 'block',
      }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)', background: 'var(--bg-input)',
          color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
        }}
      />
    </div>
  );
}
