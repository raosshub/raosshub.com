import React, { useState, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
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

function PlaceholderCard({ icon, title }: { icon: keyof typeof Icons; title: string }) {
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 40, textAlign: 'center' }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 12 }}>{renderIcon(icon, 32)}</div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{title}</h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Coming soon.</p>
    </div>
  );
}

export default function AdminSetupPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = (user as any)?.role === 'superadmin';

  const [activeTab, setActiveTab] = useState<SetupTab>('identity');
  const [tabHasChanges, setTabHasChanges] = useState(false);
  const [tabSaving, setTabSaving] = useState(false);

  const identityTabRef = useRef<ProjectIdentityTabHandle>(null);

  const handleSave = useCallback(() => {
    identityTabRef.current?.save();
  }, []);

  const handleReset = useCallback(() => {
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

        {/* Left: Sticky nav */}
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
                  <div style={{ fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 600, color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)', marginBottom: 2 }}>
                    {tab.label}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4 }}>{tab.description}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Save buttons */}
          {activeTab === 'identity' && (
            <div style={{
              marginTop: 16, padding: '14px 12px',
              background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ fontSize: 11, color: tabHasChanges ? 'var(--orange)' : 'var(--text-muted)', fontWeight: 600 }}>
                {tabHasChanges ? 'Unsaved changes' : 'All saved'}
              </div>
              <button
                onClick={handleSave}
                disabled={tabSaving || !tabHasChanges}
                style={{
                  padding: '10px 16px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent)', color: 'var(--text-inverse)',
                  border: 'none', fontSize: 13, fontWeight: 600,
                  cursor: tabSaving || !tabHasChanges ? 'not-allowed' : 'pointer',
                  opacity: tabSaving || !tabHasChanges ? 0.6 : 1,
                }}
              >
                {tabSaving ? 'Saving...' : 'Save Changes'}
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
          )}
        </div>

        {/* Right: Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {activeTab === 'identity' && (
            <ProjectIdentityTab
              ref={identityTabRef}
              onStateChange={(hc: boolean, sv: boolean) => { setTabHasChanges(hc); setTabSaving(sv); }}
            />
          )}
          {activeTab === 'appearance' && <PlaceholderCard icon="monitor" title="Appearance Settings" />}
          {activeTab === 'notifications' && <PlaceholderCard icon="bell" title="Notification Settings" />}
          {activeTab === 'integrations' && <PlaceholderCard icon="link" title="Integrations" />}
        </div>

      </div>
    </div>
  );
}
