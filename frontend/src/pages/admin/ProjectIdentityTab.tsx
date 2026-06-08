import React, {
  useState, useEffect, useRef, useCallback, useImperativeHandle,
} from 'react';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useConfigStore } from '@/stores/useConfigStore';
import { useI18nStore } from '@/stores/useI18nStore';
import { configApi, fileApi } from '@/utils/api';
import { Icons } from '@/components/icons';
import { STATUS_OPTIONS } from '@/types';

// ─── Styles (shared across all sections) ──────────────────────────────────────
const label: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
  letterSpacing: '0.5px', textTransform: 'uppercase',
  marginBottom: 5, display: 'block',
};

const input: React.CSSProperties = {
  width: '100%', padding: '8px 11px', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)', background: 'var(--bg-input)',
  color: 'var(--text-primary)', fontSize: 13, outline: 'none',
  boxSizing: 'border-box', transition: 'border-color 0.15s ease',
};

const textarea: React.CSSProperties = {
  ...input, minHeight: 72, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.55,
};

const card: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: '18px 20px',
};

const field = (style?: React.CSSProperties): React.CSSProperties => ({
  marginBottom: 14, ...style,
});

const row = (cols: string): React.CSSProperties => ({
  display: 'grid', gridTemplateColumns: cols, gap: 12, marginBottom: 14,
});

function SectionHeading({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
      <span style={{ width: 3, height: 14, background: color, borderRadius: 2, flexShrink: 0 }} />
      {children}
    </h3>
  );
}

function UploadButton({
  label: btnLabel, loading, onClick, preview, onRemove, accept,
}: {
  label: string; loading: boolean; onClick: () => void;
  preview?: string; onRemove?: () => void; accept: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {preview && (
        <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-overlay)' }}>
          {accept.includes('image') ? (
            <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <Icons.cube size={16} style={{ color: 'var(--text-muted)' }} />
          )}
        </div>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        style={{
          padding: '7px 13px', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)', background: 'var(--bg-overlay)',
          color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500,
          cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <Icons.upload size={13} />
        {loading ? 'Uploading…' : btnLabel}
      </button>
      {preview && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          style={{ padding: '7px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--red)', background: 'none', color: 'var(--red)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <Icons.close size={12} />
          Remove
        </button>
      )}
    </div>
  );
}

// ─── Form type ────────────────────────────────────────────────────────────────
interface IdentityForm {
  // Basic Information
  projectName: string;
  productCode: string;
  status: string;
  companyName: string;
  siteTitle: string;
  description: string;       // hidden from UI, preserved for Tab 3

  // Branding
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;

  // Product Visuals
  productImages: string[];
  productModelUrl: string;

  // Contact & Links
  contactEmail: string;
  websiteUrl: string;
  referenceLinks: string;

  // IP & Compliance
  copyrightNotice: string;
  trademarkNotice: string;
  patentNotice: string;
  icpZh: string;
  icpEn: string;

  // Legacy compat (stored, never shown in Tab 1 UI)
  chip: string;
  name: string;
  version: string;
  refLink1: string;
  refLink2: string;
  githubUrl: string;
  startDate: string;
  targetDate: string;
  updatedLabel: string;
}

const defaultForm: IdentityForm = {
  projectName: '', productCode: '', status: 'development', companyName: '',
  siteTitle: '', description: '',
  logoUrl: '', faviconUrl: '', primaryColor: '#3fb950',
  productImages: [], productModelUrl: '',
  contactEmail: '', websiteUrl: '', referenceLinks: '',
  copyrightNotice: '', trademarkNotice: '', patentNotice: '',
  icpZh: '', icpEn: '',
  chip: '', name: '', version: '', refLink1: '', refLink2: '',
  githubUrl: '', startDate: '', targetDate: '', updatedLabel: '',
};

// ─── Handle interface exposed to AdminSetupPage ────────────────────────────────
export interface ProjectIdentityTabHandle {
  save: () => void;
  reset: () => void;
  hasChanges: boolean;
  saving: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
const ProjectIdentityTab = React.forwardRef<
  ProjectIdentityTabHandle,
  { onStateChange?: (hasChanges: boolean, saving: boolean) => void }
>(({ onStateChange }, ref) => {
  const { addToast }           = useNotificationStore();
  const { currentLang }        = useI18nStore();
  const isZh                   = currentLang === 'zh';

  const [form, setForm]         = useState<IdentityForm>(defaultForm);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);

  const logoRef     = useRef<HTMLInputElement>(null);
  const faviconRef  = useRef<HTMLInputElement>(null);
  const imgRef      = useRef<HTMLInputElement>(null);
  const modelRef    = useRef<HTMLInputElement>(null);

  // Notify parent
  useEffect(() => { onStateChange?.(hasChanges, saving); }, [hasChanges, saving, onStateChange]);

  // ─── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    configApi.get()
      .then((res) => {
        const id = res.data?.data?.identity || {};
        if (id && Object.keys(id).length > 0) {
          setForm((prev) => ({ ...prev, ...id }));
        }
      })
      .catch(() => addToast(isZh ? '加载配置失败' : 'Failed to load config', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const update = useCallback(<K extends keyof IdentityForm>(
    field: K, value: IdentityForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  // ─── File upload ───────────────────────────────────────────────────────────
  const handleUpload = useCallback(async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string,
    maxMB: number
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxMB * 1024 * 1024) {
      addToast(
        isZh ? `文件过大，最大 ${maxMB}MB` : `File too large. Max ${maxMB}MB.`,
        'error'
      );
      return;
    }
    setUploadTarget(field);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fileApi.upload(fd);
      const url = res.data?.data;
      if (url) {
        if (field === 'productImages') {
          setForm((prev) => ({ ...prev, productImages: [...prev.productImages, url] }));
        } else {
          setForm((prev) => ({ ...prev, [field]: url }));
        }
        setHasChanges(true);
        addToast(isZh ? '上传成功' : 'Uploaded successfully', 'success');
      }
    } catch {
      addToast(isZh ? '上传失败' : 'Upload failed', 'error');
    }
    setUploadTarget(null);
    e.target.value = '';
  }, [addToast, isZh]);

  // ─── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await configApi.save({ identity: form });
      setHasChanges(false);
      useConfigStore.getState().load();
      addToast(
        isZh ? '配置已保存' : 'Configuration saved',
        'success',
      );
    } catch (err: any) {
      addToast(
        isZh
          ? '保存失败：' + (err.response?.data?.message || err.message || '网络错误')
          : 'Save failed: ' + (err.response?.data?.message || err.message || 'network error'),
        'error'
      );
    }
    setSaving(false);
  }, [form, addToast, isZh]);

  const handleReset = useCallback(() => {
    const msg = isZh ? '重置所有字段为默认值？' : 'Reset all fields to defaults?';
    if (!window.confirm(msg)) return;
    setForm(defaultForm);
    setHasChanges(true);
  }, [isZh]);

  // ─── Expose to parent ──────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    save:       handleSave,
    reset:      handleReset,
    get hasChanges() { return hasChanges; },
    get saving()     { return saving; },
  }), [handleSave, handleReset, hasChanges, saving]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, fontSize: 13, color: 'var(--text-muted)' }}>
        {isZh ? '加载中…' : 'Loading…'}
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── 1. BASIC INFORMATION ──────────────────────────────────────────── */}
      <div style={card}>
        <SectionHeading color="var(--accent)">
          {isZh ? '基本信息' : 'Basic Information'}
        </SectionHeading>

        <div style={row('1fr 1fr')}>
          <div>
            <label style={label}>{isZh ? '项目名称' : 'Project Name'}</label>
            <input
              style={input}
              value={form.projectName}
              onChange={(e) => update('projectName', e.target.value)}
              placeholder={isZh ? '例：RAOSS Hub' : 'e.g. RAOSS Hub'}
            />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              {isZh ? '显示在侧边栏顶部第一行' : 'Shown in sidebar brand block, line 1'}
            </div>
          </div>
          <div>
            <label style={label}>{isZh ? '产品代码 / SKU' : 'Product Code / SKU'}</label>
            <input
              style={input}
              value={form.productCode}
              onChange={(e) => update('productCode', e.target.value)}
              placeholder={isZh ? '例：AF007' : 'e.g. AF007'}
            />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              {isZh ? '侧边栏第二行，颜色由主色控制' : 'Sidebar line 2, rendered in Primary Color'}
            </div>
          </div>
        </div>

        <div style={row('1fr 1fr')}>
          <div>
            <label style={label}>{isZh ? '项目状态' : 'Status'}</label>
            <select
              style={input}
              value={form.status}
              onChange={(e) => update('status', e.target.value)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {isZh ? opt.zh : opt.en}
                </option>
              ))}
            </select>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              {isZh ? '显示在顶栏中央徽章' : 'Shown in topbar centre badge'}
            </div>
          </div>
          <div>
            <label style={label}>{isZh ? '公司名称' : 'Company Name'}</label>
            <input
              style={input}
              value={form.companyName}
              onChange={(e) => update('companyName', e.target.value)}
              placeholder={isZh ? '例：RAOSS HK COMPANY LIMITED' : 'e.g. RAOSS HK COMPANY LIMITED'}
            />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              {isZh ? '用于邮件发送' : 'Used in email sending'}
            </div>
          </div>
        </div>

        <div style={field()}>
          <label style={label}>{isZh ? '站点名称（浏览器标签标题）' : 'Site Name (Browser Tab Title)'}</label>
          <input
            style={input}
            value={form.siteTitle}
            onChange={(e) => update('siteTitle', e.target.value)}
            placeholder={isZh ? '例：RAOSS Hub — 产品研发中心' : 'e.g. RAOSS Hub — Product Development Hub'}
          />
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
            {isZh
              ? '设置浏览器标签页标题（HTML &lt;title&gt;），独立于项目名称。若为空则使用项目名称。'
              : 'Sets the HTML <title> tag, independent of Project Name. Falls back to Project Name if empty.'}
          </div>
        </div>
      </div>

      {/* ── 2. BRANDING ───────────────────────────────────────────────────── */}
      <div style={card}>
        <SectionHeading color="var(--blue)">
          {isZh ? '品牌视觉' : 'Branding'}
        </SectionHeading>

        {/* Logo */}
        <div style={field()}>
          <label style={label}>{isZh ? 'Logo' : 'Logo'}</label>
          <UploadButton
            label={form.logoUrl ? (isZh ? '更换 Logo' : 'Replace Logo') : (isZh ? '上传 Logo' : 'Upload Logo')}
            loading={uploadTarget === 'logoUrl'}
            onClick={() => logoRef.current?.click()}
            preview={form.logoUrl}
            onRemove={form.logoUrl ? () => { update('logoUrl', ''); } : undefined}
            accept="image/*"
          />
          <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={(e) => handleUpload(e, 'logoUrl', 5)} />
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 5 }}>
            {isZh ? '显示在侧边栏顶部 Logo 位置。PNG 或 SVG，最大 5MB。' : 'Shown in sidebar brand block. PNG or SVG recommended. Max 5MB.'}
          </div>
        </div>

        {/* Favicon + Site Name */}
        <div style={field()}>
          <label style={label}>{isZh ? '网站图标（Favicon）' : 'Favicon'}</label>
          <UploadButton
            label={form.faviconUrl ? (isZh ? '更换图标' : 'Replace Favicon') : (isZh ? '上传图标' : 'Upload Favicon')}
            loading={uploadTarget === 'faviconUrl'}
            onClick={() => faviconRef.current?.click()}
            preview={form.faviconUrl}
            onRemove={form.faviconUrl ? () => update('faviconUrl', '') : undefined}
            accept="image/*,.ico"
          />
          <input ref={faviconRef} type="file" accept="image/*,.ico" style={{ display: 'none' }}
            onChange={(e) => handleUpload(e, 'faviconUrl', 1)} />
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 5 }}>
            {isZh ? '显示在浏览器标签页。ICO 或 PNG，最大 1MB。' : 'Shown in browser tab. ICO or PNG recommended. Max 1MB.'}
          </div>
        </div>

        {/* Primary Color */}
        <div style={field()}>
          <label style={label}>{isZh ? '主色（Primary Color）' : 'Primary Color'}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="color"
              value={form.primaryColor}
              onChange={(e) => update('primaryColor', e.target.value)}
              style={{ width: 44, height: 36, padding: 2, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-input)', cursor: 'pointer' }}
            />
            <input
              style={{ ...input, width: 120, flexShrink: 0, fontFamily: "'DM Mono', monospace" }}
              value={form.primaryColor}
              onChange={(e) => update('primaryColor', e.target.value)}
              placeholder="#3fb950"
              maxLength={7}
            />
            <div style={{ width: 28, height: 28, borderRadius: 6, background: form.primaryColor, border: '1px solid var(--border)' }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 5 }}>
            {isZh ? '产品代码（SKU）文字颜色，以及邮件中使用的品牌色。' : 'Used as the Product Code / SKU text color and in email branding.'}
          </div>
        </div>
      </div>

      {/* ── 3. PRODUCT VISUALS ────────────────────────────────────────────── */}
      <div style={card}>
        <SectionHeading color="var(--purple)">
          {isZh ? '产品视觉' : 'Product Visuals'}
        </SectionHeading>

        {/* Product Images (multiple) */}
        <div style={field()}>
          <label style={label}>{isZh ? '产品图片（支持多张）' : 'Product Images (multiple)'}</label>

          {form.productImages.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {form.productImages.map((url, i) => (
                <div key={i} style={{ position: 'relative', width: 80, height: 80 }}>
                  <img src={url} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        productImages: prev.productImages.filter((_, idx) => idx !== i),
                      }));
                      setHasChanges(true);
                    }}
                    style={{
                      position: 'absolute', top: -6, right: -6, width: 18, height: 18,
                      borderRadius: '50%', background: 'var(--red)', color: 'white',
                      border: 'none', cursor: 'pointer', fontSize: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Icons.close size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <UploadButton
            label={isZh ? '添加图片' : 'Add Image'}
            loading={uploadTarget === 'productImages'}
            onClick={() => imgRef.current?.click()}
            accept="image/*"
          />
          <input ref={imgRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              for (const file of files) {
                await handleUpload(
                  { target: { files: [file], value: '' } } as any,
                  'productImages',
                  10
                );
              }
              e.target.value = '';
            }}
          />
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 5 }}>
            {isZh ? '在概览页仪表盘中展示。每张最大 10MB。' : 'Displayed in the Overview dashboard. Max 10MB each.'}
          </div>
        </div>

        {/* 3D Model */}
        <div style={field({ marginBottom: 0 })}>
          <label style={label}>{isZh ? '3D 模型（.glb 文件）' : '3D Model (.glb)'}</label>
          <UploadButton
            label={form.productModelUrl ? (isZh ? '更换模型' : 'Replace Model') : (isZh ? '上传 3D 模型' : 'Upload 3D Model')}
            loading={uploadTarget === 'productModelUrl'}
            onClick={() => modelRef.current?.click()}
            preview={form.productModelUrl}
            onRemove={form.productModelUrl ? () => update('productModelUrl', '') : undefined}
            accept=".glb,.gltf"
          />
          <input ref={modelRef} type="file" accept=".glb,.gltf" style={{ display: 'none' }}
            onChange={(e) => handleUpload(e, 'productModelUrl', 50)} />
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 5 }}>
            {isZh ? '在概览页仪表盘中使用 Google Model Viewer 展示。最大 50MB。' : 'Displayed in Overview dashboard via Google Model Viewer. Max 50MB.'}
          </div>
        </div>
      </div>

      {/* ── 4. CONTACT & LINKS ────────────────────────────────────────────── */}
      <div style={card}>
        <SectionHeading color="var(--orange)">
          {isZh ? '联系方式与链接' : 'Contact & Links'}
        </SectionHeading>

        <div style={row('1fr 1fr')}>
          <div>
            <label style={label}>{isZh ? '联系邮箱' : 'Contact Email'}</label>
            <input
              style={input}
              type="email"
              value={form.contactEmail}
              onChange={(e) => update('contactEmail', e.target.value)}
              placeholder="contact@raoss.com"
            />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              {isZh ? '用于邮件发送的发件人地址' : 'Used as sender address in email sending'}
            </div>
          </div>
          <div>
            <label style={label}>{isZh ? '官网网址' : 'Website URL'}</label>
            <input
              style={input}
              type="url"
              value={form.websiteUrl}
              onChange={(e) => update('websiteUrl', e.target.value)}
              placeholder="https://raoss.com"
            />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              {isZh ? '用于邮件发送' : 'Used in email sending'}
            </div>
          </div>
        </div>

        <div style={field({ marginBottom: 0 })}>
          <label style={label}>{isZh ? '参考链接（仅管理员可见）' : 'Reference Links (admin only)'}</label>
          <textarea
            style={textarea}
            value={form.referenceLinks}
            onChange={(e) => update('referenceLinks', e.target.value)}
            placeholder={isZh ? '每行一个链接' : 'One link per line'}
          />
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
            {isZh ? '仅管理员可见，不显示在用户界面中' : 'Visible to admin only. Not shown in the user-facing UI.'}
          </div>
        </div>
      </div>

      {/* ── 5. INTELLECTUAL PROPERTY & COMPLIANCE ─────────────────────────── */}
      <div style={card}>
        <SectionHeading color="var(--cyan)">
          {isZh ? '知识产权与合规' : 'Intellectual Property & Compliance'}
        </SectionHeading>

        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14, padding: '8px 10px', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          {isZh
            ? '以下内容显示在侧边栏底部。留空则不显示。'
            : 'These fields appear in the sidebar footer. Leave empty to hide.'}
          <span style={{ display: 'block', marginTop: 3, opacity: 0.8 }}>
            {isZh
              ? '顺序（从下到上）：版权 → 商标 → 专利 → ICP'
              : 'Order (bottom to top): Copyright → Trademark → Patent → ICP'}
          </span>
        </div>

        <div style={field()}>
          <label style={label}>{isZh ? '版权声明（第 5 行）' : 'Copyright Notice (line 5)'}</label>
          <input
            style={input}
            value={form.copyrightNotice}
            onChange={(e) => update('copyrightNotice', e.target.value)}
            placeholder={`© ${new Date().getFullYear()} RAOSS HK COMPANY LIMITED`}
          />
        </div>

        <div style={field()}>
          <label style={label}>{isZh ? '商标声明（第 4 行）' : 'Trademark Notice (line 4)'}</label>
          <input
            style={input}
            value={form.trademarkNotice}
            onChange={(e) => update('trademarkNotice', e.target.value)}
            placeholder={isZh ? '例：RAOSS® 是 RAOSS HK COMPANY LIMITED 的注册商标' : 'e.g. RAOSS® is a registered trademark of RAOSS HK COMPANY LIMITED'}
          />
        </div>

        <div style={field()}>
          <label style={label}>{isZh ? '专利声明（第 3 行）' : 'Patent Notice (line 3)'}</label>
          <input
            style={input}
            value={form.patentNotice}
            onChange={(e) => update('patentNotice', e.target.value)}
            placeholder={isZh ? '例：本产品受专利保护' : 'e.g. Protected by patent pending'}
          />
        </div>

        {/* ICP — two fields, language-conditional */}
        <div style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10 }}>
            {isZh ? 'ICP 备案（第 2 行）' : 'ICP Registration (line 2)'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
            {isZh
              ? '中文版在语言为中文时显示；英文版在所有其他语言下显示。'
              : 'ZH version shown when site language is Chinese. EN version shown for all other languages.'}
          </div>
          <div style={row('1fr 1fr')}>
            <div>
              <label style={label}>ICP (ZH) — 中文</label>
              <input
                style={input}
                value={form.icpZh}
                onChange={(e) => update('icpZh', e.target.value)}
                placeholder="粤ICP备2025454823号"
                dir="ltr"
              />
            </div>
            <div>
              <label style={label}>ICP (EN) — English</label>
              <input
                style={input}
                value={form.icpEn}
                onChange={(e) => update('icpEn', e.target.value)}
                placeholder="Guangdong ICP Record No. 2025454823"
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
});

ProjectIdentityTab.displayName = 'ProjectIdentityTab';
export default ProjectIdentityTab;
