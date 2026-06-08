import React, { useState, useRef, useCallback } from 'react';
import { useAuthStore }    from '@/stores/useAuthStore';
import { useI18nStore }    from '@/stores/useI18nStore';
import { Icons }           from '@/components/icons';
import ProjectIdentityTab, { type ProjectIdentityTabHandle } from './ProjectIdentityTab';
import LanguageTranslationTab from './LanguageTranslationTab';

type SetupTab =
  | 'identity' | 'language' | 'dashboard' | 'users' | 'teams'
  | 'notifications' | 'integrations' | 'hubassist' | 'auditlog';

interface TabDef {
  id: SetupTab;
  icon: keyof typeof Icons;
  labelEn: string;
  labelZh: string;
  descEn:  string;
  descZh:  string;
  status:  'live' | 'coming';
}

const TABS: TabDef[] = [
  { id: 'identity',      icon: 'cube',    status: 'live',
    labelEn: 'Project Identity & Branding', labelZh: '项目身份与品牌',
    descEn:  'Name, branding, product visuals, contact, IP notices',
    descZh:  '项目名称、品牌、产品视觉、联系方式、知识产权' },
  { id: 'language',      icon: 'layers',  status: 'live',
    labelEn: 'Language & Translation',      labelZh: '语言与翻译',
    descEn:  'Default language, add languages, AI translation',
    descZh:  '默认语言、添加语言、AI 翻译' },
  { id: 'dashboard',     icon: 'monitor', status: 'coming',
    labelEn: 'Dashboard Settings',          labelZh: '仪表盘设置',
    descEn:  'Executive summary, specs, timeline, responsibility, actions',
    descZh:  '执行摘要、规格、时间线、职责矩阵、行动项' },
  { id: 'users',         icon: 'users',   status: 'coming',
    labelEn: 'Users',                       labelZh: '用户管理',
    descEn:  'Add, edit, deactivate users, roles, permissions',
    descZh:  '添加、编辑、停用用户，角色与权限管理' },
  { id: 'teams',         icon: 'package', status: 'coming',
    labelEn: 'Teams',                       labelZh: '团队管理',
    descEn:  'Add, edit, reorder teams, assign icons',
    descZh:  '添加、编辑、排序团队，分配图标' },
  { id: 'notifications', icon: 'bell',    status: 'coming',
    labelEn: 'Notification Settings',       labelZh: '通知设置',
    descEn:  'Version display, NDA text & enforcement',
    descZh:  '版本展示、NDA 内容与执行设置' },
  { id: 'integrations',  icon: 'link',    status: 'coming',
    labelEn: 'Integrations',                labelZh: '集成配置',
    descEn:  'Kimi API key, email SMTP, Danger Zone',
    descZh:  'Kimi API 密钥、邮件 SMTP、危险操作区' },
  { id: 'hubassist',     icon: 'robot',   status: 'coming',
    labelEn: 'Hub Assist',                  labelZh: 'Hub 助手',
    descEn:  'Kimi behavior, prompt templates, rate limits',
    descZh:  'Kimi 行为配置、提示词模板、请求限制' },
  { id: 'auditlog',      icon: 'clock',   status: 'coming',
    labelEn: 'Audit Log',                   labelZh: '审计日志',
    descEn:  'View-only activity trail',
    descZh:  '只读活动记录' },
];

function ComingSoonCard({ tab, isZh }: { tab: TabDef; isZh: boolean }) {
  const IconComp = Icons[tab.icon];
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '48px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--bg-overlay)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        {IconComp && <IconComp size={24} />}
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{isZh ? tab.labelZh : tab.labelEn}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 380 }}>{isZh ? tab.descZh : tab.descEn}</div>
      </div>
      <div style={{ padding: '5px 14px', borderRadius: 99, background: 'var(--blue-dim)', color: 'var(--blue)', fontSize: 11, fontWeight: 700, letterSpacing: '0.3px', border: '1px solid rgba(88,166,255,0.3)' }}>
        {isZh ? '即将推出' : 'Coming Soon'}
      </div>
    </div>
  );
}

export default function AdminSetupPage() {
  const { user }        = useAuthStore();
  const { currentLang } = useI18nStore();
  const isZh            = currentLang === 'zh';
  const isSuperAdmin    = (user as any)?.role === 'superadmin';

  const [activeTab,    setActiveTab]    = useState<SetupTab>('identity');
  const [tabHasChanges, setTabHasChanges] = useState(false);
  const [tabSaving,    setTabSaving]    = useState(false);

  const identityTabRef = useRef<ProjectIdentityTabHandle>(null);

  const handleSave = useCallback(() => {
    if (activeTab === 'identity') identityTabRef.current?.save();
  }, [activeTab]);

  const handleReset = useCallback(() => {
    if (activeTab === 'identity') identityTabRef.current?.reset();
  }, [activeTab]);

  if (!isSuperAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--red-dim)', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icons.shield size={28} /></div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{isZh ? '访问受限' : 'Access Denied'}</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 400 }}>
          {isZh ? '只有超级管理员可以访问管理设置页面。' : 'Only Super Admin users can access the Admin Setup page.'}
        </p>
      </div>
    );
  }

  const activeTabDef = TABS.find((t) => t.id === activeTab)!;
  const showSavePanel = activeTab === 'identity';

  return (
    <div style={{ width: '100%', maxWidth: 1040 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{isZh ? '管理设置' : 'Admin Setup'}</h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {isZh ? '配置您的 Hub 设置。这些设置将影响所有用户看到的内容。' : 'Configure your hub. These settings affect how the hub appears to all users.'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* Left nav */}
        <div style={{ width: 252, flexShrink: 0, position: 'sticky', top: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {TABS.map((tab) => {
              const active   = activeTab === tab.id;
              const IconComp = Icons[tab.icon];
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', background: active ? 'var(--accent-dim)' : 'transparent', transition: 'all var(--transition)' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 7, flexShrink: 0, marginTop: 1, background: active ? 'var(--accent)' : 'var(--bg-elevated)', color: active ? 'var(--text-inverse)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: active ? 'none' : '1px solid var(--border)', transition: 'all var(--transition)' }}>
                    {IconComp && <IconComp size={14} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? 'var(--text-primary)' : 'var(--text-secondary)', lineHeight: 1.3 }}>
                        {isZh ? tab.labelZh : tab.labelEn}
                      </span>
                      {tab.status === 'coming' && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: 'var(--bg-overlay)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                          {isZh ? '即将推出' : 'SOON'}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {isZh ? tab.descZh : tab.descEn}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Save panel — identity tab only */}
          {showSavePanel && (
            <div style={{ marginTop: 14, padding: '14px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, color: tabHasChanges ? 'var(--orange)' : 'var(--text-muted)', fontWeight: 600 }}>
                {tabHasChanges ? (isZh ? '有未保存的更改' : 'Unsaved changes') : (isZh ? '已全部保存' : 'All saved')}
              </div>
              <button onClick={handleSave} disabled={tabSaving || !tabHasChanges}
                style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', fontSize: 13, fontWeight: 600, cursor: tabSaving || !tabHasChanges ? 'not-allowed' : 'pointer', opacity: tabSaving || !tabHasChanges ? 0.6 : 1, transition: 'opacity var(--transition)' }}>
                {tabSaving ? (isZh ? '保存中…' : 'Saving…') : (isZh ? '保存更改' : 'Save Changes')}
              </button>
              <button onClick={handleReset}
                style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', background: 'none', color: 'var(--text-secondary)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                {isZh ? '重置为默认' : 'Reset to Default'}
              </button>
            </div>
          )}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {activeTab === 'identity'  && (
            <ProjectIdentityTab ref={identityTabRef}
              onStateChange={(hc, sv) => { setTabHasChanges(hc); setTabSaving(sv); }} />
          )}
          {activeTab === 'language'  && <LanguageTranslationTab />}
          {activeTab !== 'identity' && activeTab !== 'language' && (
            <ComingSoonCard tab={activeTabDef} isZh={isZh} />
          )}
        </div>
      </div>
    </div>
  );
}
