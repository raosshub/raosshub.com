import React, { useState, useRef, useCallback } from 'react';
import { useLocation }        from 'react-router-dom';
import { useAuthStore }    from '@/stores/useAuthStore';
import { useI18nStore }    from '@/stores/useI18nStore';
import { Icons }           from '@/components/icons';
import ProjectIdentityTab,   { type ProjectIdentityTabHandle }   from './ProjectIdentityTab';
import LanguageTranslationTab                                     from './LanguageTranslationTab';
import DashboardSettingsTab, { type DashboardSettingsTabHandle } from './DashboardSettingsTab';
import NotificationsTab,     { type NotificationsTabHandle }     from './NotificationsTab';
import IntegrationsTab,      { type IntegrationsTabHandle }      from './IntegrationsTab';
import type { Language } from '@/types';

export type SetupTab =
  | 'identity' | 'language' | 'dashboard' | 'users' | 'teams'
  | 'notifications' | 'integrations' | 'hubassist' | 'auditlog';

export interface TabContext {
  reason?:           'kimi_required';
  pendingDefaultLang?: Language;
  kimiVerified?:     boolean;
}

interface TabDef {
  id: SetupTab; icon: keyof typeof Icons;
  labelKey: string; labelFb: string;
  descKey: string; descFb: string;
  status: 'live' | 'coming';
}

const TABS: TabDef[] = [
  { id: 'identity',      icon: 'cube',    status: 'live',
    labelKey: 'tab_identity_label',      labelFb: 'Project Identity & Branding',
    descKey:  'tab_identity_desc',       descFb:  'Name, branding, product visuals, contact, IP notices' },
  { id: 'language',      icon: 'layers',  status: 'live',
    labelKey: 'tab_language_label',      labelFb: 'Language & Translation',
    descKey:  'tab_language_desc',       descFb:  'Default language, add languages, AI translation' },
  { id: 'dashboard',     icon: 'monitor', status: 'live',
    labelKey: 'tab_dashboard_label',     labelFb: 'Dashboard Settings',
    descKey:  'tab_dashboard_desc',      descFb:  'Executive summary, specs, timeline, responsibility' },
  { id: 'users',         icon: 'users',   status: 'coming',
    labelKey: 'tab_users_label',         labelFb: 'Users',
    descKey:  'tab_users_desc',          descFb:  'Add, edit, deactivate users, roles, permissions' },
  { id: 'teams',         icon: 'package', status: 'coming',
    labelKey: 'tab_teams_label',         labelFb: 'Teams',
    descKey:  'tab_teams_desc',          descFb:  'Add, edit, reorder teams, assign icons' },
  { id: 'notifications', icon: 'bell',    status: 'live',
    labelKey: 'tab_notifications_label', labelFb: 'Notification Settings',
    descKey:  'tab_notifications_desc',  descFb:  'Version display, NDA text & enforcement' },
  { id: 'integrations',  icon: 'link',    status: 'live',
    labelKey: 'tab_integrations_label',  labelFb: 'Integrations',
    descKey:  'tab_integrations_desc',   descFb:  'Kimi API key, email SMTP, Danger Zone' },
  { id: 'hubassist',     icon: 'robot',   status: 'coming',
    labelKey: 'tab_hubassist_label',     labelFb: 'Hub Assist',
    descKey:  'tab_hubassist_desc',      descFb:  'Kimi behavior, prompt templates, rate limits' },
  { id: 'auditlog',      icon: 'clock',   status: 'coming',
    labelKey: 'tab_auditlog_label',      labelFb: 'Audit Log',
    descKey:  'tab_auditlog_desc',       descFb:  'View-only activity trail' },
];

const TABS_WITH_SAVE = new Set<SetupTab>([
  'identity', 'dashboard', 'notifications', 'integrations'
]);

function ComingSoonCard({ tab }: { tab: TabDef }) {
  const { t } = useI18nStore();
  const IconComp = Icons[tab.icon];
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '48px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--bg-overlay)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        {IconComp && <IconComp size={24} />}
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{t(tab.labelKey, tab.labelFb)}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 380 }}>{t(tab.descKey, tab.descFb)}</div>
      </div>
      <div style={{ padding: '5px 14px', borderRadius: 99, background: 'var(--blue-dim)', color: 'var(--blue)', fontSize: 11, fontWeight: 700, border: '1px solid rgba(88,166,255,0.3)' }}>
        {t('admin_coming_soon', 'Coming Soon')}
      </div>
    </div>
  );
}

export default function AdminSetupPage() {
  const { user }     = useAuthStore();
  const { t }        = useI18nStore();
  const location     = useLocation();
  const isSuperAdmin = (user as any)?.role === 'superadmin';

  const initialTab   = ((location.state as any)?.tab as SetupTab) || 'identity';
  const [activeTab,        setActiveTab]        = useState<SetupTab>(initialTab);
  const [tabHasChanges,    setTabHasChanges]    = useState(false);
  const [tabSaving,        setTabSaving]        = useState(false);
  const [tabContext,       setTabContext]        = useState<TabContext | null>(null);
  const [translationRunning, setTranslationRunning] = useState(false);

  const identityTabRef       = useRef<ProjectIdentityTabHandle>(null);
  const dashboardTabRef      = useRef<DashboardSettingsTabHandle>(null);
  const notificationsTabRef  = useRef<NotificationsTabHandle>(null);
  const integrationsTabRef   = useRef<IntegrationsTabHandle>(null);

  const handleSave = useCallback(() => {
    if (activeTab === 'identity')      identityTabRef.current?.save();
    if (activeTab === 'dashboard')     dashboardTabRef.current?.save();
    if (activeTab === 'notifications') notificationsTabRef.current?.save();
    if (activeTab === 'integrations')  integrationsTabRef.current?.save();
  }, [activeTab]);

  const handleReset = useCallback(() => {
    if (activeTab === 'identity')      identityTabRef.current?.reset();
    if (activeTab === 'dashboard')     dashboardTabRef.current?.reset();
    if (activeTab === 'notifications') notificationsTabRef.current?.reset();
    if (activeTab === 'integrations')  integrationsTabRef.current?.reset();
  }, [activeTab]);

  const handleStateChange = useCallback((hc: boolean, sv: boolean) => {
    setTabHasChanges(hc); setTabSaving(sv);
  }, []);

  const handleTabSwitch = (tab: SetupTab) => {
    if (translationRunning && activeTab === 'language' && tab !== 'language') {
      const ok = window.confirm(
        t('lt_translating_status', 'Translating\u2026') +
        '\n\n' +
        'Translation is in progress. Navigating away will stop it. Continue?'
      );
      if (!ok) return;
      // User confirmed — abort is triggered by LanguageTranslationTab unmount cleanup
    }
    setActiveTab(tab); setTabHasChanges(false); setTabSaving(false);
  };

  const handleNavigateToIntegrations = useCallback((ctx: TabContext) => {
    setTabContext(ctx);
    setActiveTab('integrations');
    setTabHasChanges(false); setTabSaving(false);
  }, []);

  const handleReturnToLanguages = useCallback((ctx: TabContext) => {
    setTabContext(ctx);
    setActiveTab('language');
    setTabHasChanges(false); setTabSaving(false);
  }, []);

  const handleClearContext = useCallback(() => { setTabContext(null); }, []);

  if (!isSuperAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--red-dim)', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icons.shield size={28} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{t('admin_access_denied', 'Access Denied')}</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 400 }}>{t('admin_access_denied_desc', 'Only Super Admin users can access the Admin Setup page.')}</p>
      </div>
    );
  }

  const activeTabDef  = TABS.find(tab => tab.id === activeTab)!;
  const showSavePanel = TABS_WITH_SAVE.has(activeTab) && activeTabDef.status === 'live';

  return (
    <div style={{ width: '100%', maxWidth: 1040 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{t('admin_setup_title', 'Admin Setup')}</h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{t('admin_setup_desc', 'Configure your hub. These settings affect how the hub appears to all users.')}</p>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* Left nav */}
        <div style={{ width: 252, flexShrink: 0, position: 'sticky', top: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {TABS.map(tab => {
              const active   = activeTab === tab.id;
              const IconComp = Icons[tab.icon];
              return (
                <button key={tab.id} onClick={() => handleTabSwitch(tab.id)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', background: active ? 'var(--accent-dim)' : 'transparent', transition: 'all var(--transition)' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 7, flexShrink: 0, marginTop: 1, background: active ? 'var(--accent)' : 'var(--bg-elevated)', color: active ? 'var(--text-inverse)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: active ? 'none' : '1px solid var(--border)', transition: 'all var(--transition)' }}>
                    {IconComp && <IconComp size={14} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? 'var(--text-primary)' : 'var(--text-secondary)', lineHeight: 1.3 }}>
                        {t(tab.labelKey, tab.labelFb)}
                      </span>
                      {tab.status === 'coming' && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: 'var(--bg-overlay)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                          {t('admin_coming_soon', 'SOON')}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t(tab.descKey, tab.descFb)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {showSavePanel && (
            <div style={{ marginTop: 14, padding: '14px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, color: tabHasChanges ? 'var(--orange)' : 'var(--text-muted)', fontWeight: 600 }}>
                {tabHasChanges ? t('admin_unsaved_changes', 'Unsaved changes') : t('admin_all_saved', 'All saved')}
              </div>
              <button onClick={handleSave} disabled={tabSaving || !tabHasChanges}
                style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', fontSize: 13, fontWeight: 600, cursor: tabSaving || !tabHasChanges ? 'not-allowed' : 'pointer', opacity: tabSaving || !tabHasChanges ? 0.6 : 1 }}>
                {tabSaving ? t('admin_saving', 'Saving…') : t('admin_save_changes', 'Save Changes')}
              </button>
              <button onClick={handleReset}
                style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', background: 'none', color: 'var(--text-secondary)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                {activeTab === 'identity' ? t('admin_reset_to_default', 'Reset to Default') : t('admin_discard_changes', 'Discard Changes')}
              </button>
            </div>
          )}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {activeTab === 'identity' && (
            <ProjectIdentityTab ref={identityTabRef} onStateChange={handleStateChange} />
          )}
          {activeTab === 'language' && (
            <LanguageTranslationTab
              tabContext={tabContext}
              onNavigateToIntegrations={handleNavigateToIntegrations}
              onClearContext={handleClearContext}
              onRunningChange={setTranslationRunning}
            />
          )}
          {activeTab === 'dashboard' && (
            <DashboardSettingsTab ref={dashboardTabRef} onStateChange={handleStateChange} />
          )}
          {activeTab === 'notifications' && (
            <NotificationsTab ref={notificationsTabRef} onStateChange={handleStateChange} />
          )}
          {activeTab === 'integrations' && (
            <IntegrationsTab
              ref={integrationsTabRef}
              onStateChange={handleStateChange}
              tabContext={activeTab === 'integrations' ? tabContext : null}
              onReturnToLanguages={handleReturnToLanguages}
            />
          )}
          {!['identity','language','dashboard','notifications','integrations'].includes(activeTab) && (
            <ComingSoonCard tab={activeTabDef} />
          )}
        </div>
      </div>
    </div>
  );
}
