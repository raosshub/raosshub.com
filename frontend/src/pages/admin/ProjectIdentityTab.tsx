import React, { useState, useEffect, useRef, useCallback, useImperativeHandle } from 'react';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useConfigStore }       from '@/stores/useConfigStore';
import { useI18nStore }         from '@/stores/useI18nStore';
import { configApi, fileApi }   from '@/utils/api';
import { Icons }                from '@/components/icons';

/* ─── Styles ──────────────────────────────────────────────────── */
const labelSt: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
  letterSpacing: '0.5px', textTransform: 'uppercase',
  marginBottom: 6, display: 'block',
};
const inputSt: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)', background: 'var(--bg-input)',
  color: 'var(--text-primary)', fontSize: 13, outline: 'none',
  boxSizing: 'border-box',
};
const selectSt: React.CSSProperties  = { ...inputSt, cursor: 'pointer' };
const textareaSt: React.CSSProperties = { ...inputSt, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' };
const cardSt: React.CSSProperties    = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: 20,
};
const hintSt: React.CSSProperties = { fontSize: 11, color: 'var(--text-muted)', marginTop: 4 };

/* ─── Status dot colours ──────────────────────────────────────── */
const STATUS_DOT: Record<string, string> = {
  planning: '#6b7280', development: '#3b82f6', prototype: '#f59e0b',
  production: '#10b981', maintenance: '#8b5cf6', completed: '#059669',
};

/* ─── Normalise legacy status values from DB ─────────────────── */
const normaliseStatus = (s: string): string => {
  if (!s) return 'planning';
  const lower = s.toLowerCase().replace(/[\s-]/g, '');
  const map: Record<string, string> = {
    'indevelopment': 'development',
    'development':   'development',
    'planning':      'planning',
    'prototype':     'prototype',
    'production':    'production',
    'maintenance':   'maintenance',
    'completed':     'completed',
  };
  return map[lower] ?? s;
};

/* ─── Types ───────────────────────────────────────────────────── */
interface IdentityForm {
  projectName:    string;
  productCode:    string;
  companyName:    string;
  status:         string;
  siteTitle:      string;
  description:    string;
  logoUrl:        string;
  faviconUrl:     string;
  primaryColor:   string;
  productImages:  string[];
  productModelUrl:string;
  contactEmail:   string;
  websiteUrl:     string;
  referenceLinks: string;
  icpZh:          string;
  icpEn:          string;
  patentNotice:   string;
  trademarkNotice:string;
  copyrightNotice:string;
}

const defaultForm: IdentityForm = {
  projectName: '', productCode: '', companyName: '', status: 'planning',
  siteTitle: '', description: '', logoUrl: '', faviconUrl: '',
  primaryColor: '#4f46e5', productImages: [], productModelUrl: '',
  contactEmail: '', websiteUrl: '', referenceLinks: '',
  icpZh: '', icpEn: '', patentNotice: '', trademarkNotice: '', copyrightNotice: '',
};

/* ─── Handle types ────────────────────────────────────────────── */
export interface ProjectIdentityTabHandle {
  save: () => void; reset: () => void;
  hasChanges: boolean; saving: boolean;
}
interface Props { onStateChange?: (hasChanges: boolean, saving: boolean) => void; }

/* ─── Sub-components ──────────────────────────────────────────── */
const SectionTitle = ({ color, label }: { color: string; label: string }) => (
  <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16,
               display: 'flex', alignItems: 'center', gap: 8 }}>
    <span style={{ width: 4, height: 16, background: color, borderRadius: 2 }} />
    {label}
  </h3>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={labelSt}>{label}</label>
    {children}
  </div>
);

const UploadZone = ({ onClick, uploading, hint, icon }: {
  onClick: () => void; uploading: boolean; hint: string; icon: keyof typeof Icons;
}) => {
  const { t } = useI18nStore();
  const IC = Icons[icon] || Icons.upload;
  return (
    <button onClick={onClick} disabled={uploading}
      style={{ width: '100%', padding: '20px 16px', borderRadius: 'var(--radius-sm)',
               border: '2px dashed var(--border)', background: 'var(--bg-base)',
               color: 'var(--text-muted)', cursor: uploading ? 'wait' : 'pointer', textAlign: 'center' }}>
      <div style={{ fontSize: 20, marginBottom: 4, color: uploading ? 'var(--accent)' : 'var(--text-muted)' }}>
        {uploading ? '...' : <IC size={24} />}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600 }}>
        {uploading ? t('tab1_uploading', 'Uploading…') : t('tab1_click_upload', 'Click to upload')}
      </div>
      <div style={{ fontSize: 10, marginTop: 2, opacity: 0.7 }}>{hint}</div>
    </button>
  );
};

const SmallBtn = ({ onClick, label, uploading }: { onClick: () => void; label: string; uploading?: boolean }) => (
  <button onClick={onClick} disabled={uploading}
    style={{ padding: '6px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-base)',
             color: 'var(--text-secondary)', border: '1px solid var(--border)',
             fontSize: 12, fontWeight: 600, cursor: uploading ? 'wait' : 'pointer' }}>
    {uploading ? '…' : label}
  </button>
);

const DangerBtn = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button onClick={onClick}
    style={{ padding: '6px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--red-dim)',
             color: 'var(--red)', border: '1px solid rgba(248,81,73,0.3)',
             fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
    {label}
  </button>
);

/* ─── Main component ──────────────────────────────────────────── */
const ProjectIdentityTab = React.forwardRef<ProjectIdentityTabHandle, Props>(
  ({ onStateChange }, ref) => {

  const { addToast }  = useNotificationStore();
  const { t }         = useI18nStore();

  const [form,        setForm]        = useState<IdentityForm>(defaultForm);
  const [original,    setOriginal]    = useState<IdentityForm>(defaultForm);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [hasChanges,  setHasChanges]  = useState(false);
  const [uploadTarget,setUploadTarget]= useState<string | null>(null);

  useEffect(() => { onStateChange?.(hasChanges, saving); }, [hasChanges, saving, onStateChange]);

  const logoInputRef      = useRef<HTMLInputElement>(null);
  const faviconInputRef   = useRef<HTMLInputElement>(null);
  const productImgInputRef= useRef<HTMLInputElement>(null);
  const modelInputRef     = useRef<HTMLInputElement>(null);

  /* ─── Load ────────────────────────────────────────────────── */
  useEffect(() => {
    configApi.get().then(res => {
      const id = (res.data?.data?.identity || {}) as Record<string, any>;
      const loaded: IdentityForm = {
        ...defaultForm,
        projectName:    id.projectName    ?? '',
        productCode:    id.productCode    ?? '',
        companyName:    id.companyName    ?? '',
        status:         normaliseStatus(id.status ?? ''),
        siteTitle:      id.siteTitle      ?? '',
        description:    id.description    ?? '',
        logoUrl:        id.logoUrl        ?? '',
        faviconUrl:     id.faviconUrl     ?? '',
        primaryColor:   id.primaryColor   ?? '#4f46e5',
        productImages:  Array.isArray(id.productImages) ? id.productImages : [],
        productModelUrl:id.productModelUrl ?? '',
        contactEmail:   id.contactEmail   ?? '',
        websiteUrl:     id.websiteUrl     ?? '',
        referenceLinks: id.referenceLinks ?? '',
        icpZh:          id.icpZh          ?? '',
        icpEn:          id.icpEn          ?? '',
        patentNotice:   id.patentNotice   ?? '',
        trademarkNotice:id.trademarkNotice?? '',
        copyrightNotice:id.copyrightNotice?? '',
      };
      setForm(loaded);
      setOriginal(loaded);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  const updateField = useCallback((field: keyof IdentityForm, value: IdentityForm[keyof IdentityForm]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  /* ─── File upload ─────────────────────────────────────────── */
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>, field: string, maxSizeMB: number) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > maxSizeMB * 1024 * 1024) {
        addToast(
          t('tab1_file_too_large', 'File too large — max {size} MB').replace('{size}', String(maxSizeMB)),
          'error'
        );
        return;
      }
      setUploadTarget(field);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fileApi.upload(fd);
        const url = res.data?.data as string;
        if (url) {
          if (field === 'productImages') {
            setForm(prev => ({ ...prev, productImages: [...prev.productImages, url] }));
            setHasChanges(true);
          } else {
            updateField(field as keyof IdentityForm, url);
          }
          addToast(t('tab1_upload_success', 'Uploaded successfully'), 'success');
        }
      } catch {
        addToast(t('tab1_upload_fail', 'Upload failed'), 'error');
      }
      setUploadTarget(null);
      e.target.value = '';
    },
    [addToast, updateField, t]
  );

  const removeImage = useCallback((idx: number) => {
    setForm(prev => ({ ...prev, productImages: prev.productImages.filter((_, i) => i !== idx) }));
    setHasChanges(true);
  }, []);

  /* ─── Save ────────────────────────────────────────────────── */
  // Load existing identity first so Tab 3 fields (chip, version, dates, links)
  // are preserved — saving Tab 1 must never wipe them.
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const configRes      = await configApi.get();
      const existingIdent  = (configRes.data?.data?.identity || {}) as Record<string, any>;
      await configApi.save({ identity: { ...existingIdent, ...form } });
      setOriginal({ ...form });
      setHasChanges(false);
      useConfigStore.getState().load();
      addToast(t('tab1_save_success', 'Configuration saved successfully'), 'success');
    } catch (err: any) {
      addToast(
        t('tab1_save_fail', 'Save failed') + ': ' +
        (err.response?.data?.message || err.message || 'network error'),
        'error'
      );
    }
    setSaving(false);
  }, [form, addToast, t]);

  const handleReset = useCallback(() => {
    if (!window.confirm(t('tab1_reset_confirm', 'Reset all fields to defaults?'))) return;
    setForm(defaultForm);
    setHasChanges(true);
  }, [t]);

  useImperativeHandle(ref, () => ({
    save: handleSave, reset: handleReset,
    get hasChanges() { return hasChanges; },
    get saving()     { return saving; },
  }), [handleSave, handleReset, hasChanges, saving]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                    height: 200, fontSize: 13, color: 'var(--text-muted)' }}>
        {t('tab1_loading', 'Loading…')}
      </div>
    );
  }

  const dotColor = STATUS_DOT[form.status] || '#6b7280';

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          {t('tab1_page_title', 'Project Identity & Branding')}
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {t('tab1_page_desc', 'Define your product identity, branding, and legal notices.')}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>

        {/* ── Basic Information ─────────────────────────────── */}
        <div style={cardSt}>
          <SectionTitle color="var(--accent)" label={t('tab1_section_basic', 'Basic Information')} />

          <Field label={t('tab1_project_name', 'Project Name') + ' *'}>
            <input type="text" value={form.projectName}
              onChange={e => updateField('projectName', e.target.value)}
              placeholder="e.g. Smart Home Hub Pro" style={inputSt} />
          </Field>

          <Field label={t('tab1_product_code', 'Product Code / SKU')}>
            <input type="text" value={form.productCode}
              onChange={e => updateField('productCode', e.target.value)}
              placeholder="e.g. RSH-2024-001" style={inputSt} />
          </Field>

          <Field label={t('tab1_company_name', 'Company Name') + ' *'}>
            <input type="text" value={form.companyName}
              onChange={e => updateField('companyName', e.target.value)}
              placeholder="e.g. RAOSS Technologies" style={inputSt} />
          </Field>

          <Field label={t('tab1_status', 'Status')}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <select value={form.status} onChange={e => updateField('status', e.target.value)}
                style={{ ...selectSt, flex: 1 }}>
                <option value="planning">    {t('tab1_status_planning',    'Planning')}</option>
                <option value="development"> {t('tab1_status_development', 'In Development')}</option>
                <option value="prototype">   {t('tab1_status_prototype',   'Prototype')}</option>
                <option value="production">  {t('tab1_status_production',  'Production')}</option>
                <option value="maintenance"> {t('tab1_status_maintenance', 'Maintenance')}</option>
                <option value="completed">   {t('tab1_status_completed',   'Completed')}</option>
              </select>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
            </div>
          </Field>

          <Field label={t('tab1_site_title', 'Site Name (Browser Tab Title)')}>
            <input type="text" value={form.siteTitle}
              onChange={e => updateField('siteTitle', e.target.value)}
              placeholder={form.projectName || 'Smart Home Hub Pro — RAOSS'}
              style={inputSt} />
            <div style={hintSt}>{t('tab1_site_title_hint', 'Sets the browser tab title. If empty, Project Name is used.')}</div>
          </Field>

          <Field label={t('tab1_description', 'Description')}>
            <textarea value={form.description}
              onChange={e => updateField('description', e.target.value)}
              placeholder="Brief product description..." style={textareaSt} rows={4} />
          </Field>
        </div>

        {/* ── Branding ──────────────────────────────────────── */}
        <div style={cardSt}>
          <SectionTitle color="var(--orange)" label={t('tab1_section_branding', 'Branding')} />

          <Field label={t('tab1_logo', 'Logo')}>
            <input ref={logoInputRef} type="file" accept=".jpg,.jpeg,.png,.svg,.webp"
              style={{ display: 'none' }}
              onChange={e => handleFileUpload(e, 'logoUrl', 10)} />
            {form.logoUrl ? (
              <div>
                <img src={form.logoUrl} alt="Logo"
                  style={{ maxHeight: 60, maxWidth: 180, objectFit: 'contain', borderRadius: 'var(--radius-sm)' }} />
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <SmallBtn onClick={() => logoInputRef.current?.click()}
                    label={t('tab1_replace', 'Replace')} uploading={uploadTarget === 'logoUrl'} />
                  <DangerBtn onClick={() => updateField('logoUrl', '')} label={t('tab1_remove', 'Remove')} />
                </div>
              </div>
            ) : (
              <UploadZone onClick={() => logoInputRef.current?.click()}
                uploading={uploadTarget === 'logoUrl'}
                hint={t('tab1_logo_hint', 'JPG, PNG, SVG, WebP — max 10 MB')} icon="image" />
            )}
          </Field>

          <Field label={t('tab1_favicon', 'Favicon')}>
            <input ref={faviconInputRef} type="file" accept=".ico,.png,.svg"
              style={{ display: 'none' }}
              onChange={e => handleFileUpload(e, 'faviconUrl', 5)} />
            {form.faviconUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src={form.faviconUrl} alt="Favicon"
                  style={{ width: 32, height: 32, borderRadius: 4, border: '1px solid var(--border)' }} />
                <SmallBtn onClick={() => faviconInputRef.current?.click()}
                  label={t('tab1_replace', 'Replace')} uploading={uploadTarget === 'faviconUrl'} />
                <DangerBtn onClick={() => updateField('faviconUrl', '')} label={t('tab1_remove', 'Remove')} />
              </div>
            ) : (
              <UploadZone onClick={() => faviconInputRef.current?.click()}
                uploading={uploadTarget === 'faviconUrl'}
                hint={t('tab1_favicon_hint', 'ICO, PNG, SVG — max 5 MB')} icon="pin" />
            )}
          </Field>

          <Field label={t('tab1_primary_color', 'Primary Color')}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="color" value={form.primaryColor}
                onChange={e => updateField('primaryColor', e.target.value)}
                style={{ width: 44, height: 36, padding: 2, border: '1px solid var(--border)',
                         borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'var(--bg-input)' }} />
              <input type="text" value={form.primaryColor}
                onChange={e => updateField('primaryColor', e.target.value)}
                placeholder="#4f46e5" style={{ ...inputSt, flex: 1 }} />
              <div style={{ width: 24, height: 24, borderRadius: 4,
                            background: form.primaryColor, border: '1px solid var(--border)' }} />
            </div>
          </Field>
        </div>

        {/* ── Product Visuals ───────────────────────────────── */}
        <div style={cardSt}>
          <SectionTitle color="var(--green)" label={t('tab1_section_visuals', 'Product Visuals')} />

          <Field label={`${t('tab1_product_images', 'Product Images')} (${form.productImages.length}/10)`}>
            <input ref={productImgInputRef} type="file" accept=".jpg,.jpeg,.png,.webp"
              style={{ display: 'none' }}
              onChange={e => handleFileUpload(e, 'productImages', 10)} />
            {form.productImages.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
                {form.productImages.map((url, idx) => (
                  <div key={idx} style={{ position: 'relative', borderRadius: 'var(--radius-sm)',
                                          overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <img src={url} alt={`Product ${idx + 1}`}
                      style={{ width: '100%', height: 80, objectFit: 'cover' }} />
                    <button onClick={() => removeImage(idx)}
                      style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20,
                               borderRadius: '50%', background: 'var(--red)', color: 'white',
                               border: 'none', fontSize: 10, cursor: 'pointer',
                               display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            {form.productImages.length < 10 && (
              <UploadZone onClick={() => productImgInputRef.current?.click()}
                uploading={uploadTarget === 'productImages'}
                hint={t('tab1_product_images_hint', 'JPG, PNG, WebP — max 10 MB each')} icon="camera" />
            )}
          </Field>

          <Field label={t('tab1_product_model', '3D Model (.glb / .gltf)')}>
            <input ref={modelInputRef} type="file" accept=".glb,.gltf"
              style={{ display: 'none' }}
              onChange={e => handleFileUpload(e, 'productModelUrl', 50)} />
            {form.productModelUrl ? (
              <div style={{ padding: 12, background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {t('tab1_3d_model_uploaded', '3D Model Uploaded')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', wordBreak: 'break-all', marginBottom: 8 }}>
                  {form.productModelUrl}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <SmallBtn onClick={() => modelInputRef.current?.click()}
                    label={t('tab1_replace', 'Replace')} uploading={uploadTarget === 'productModelUrl'} />
                  <DangerBtn onClick={() => updateField('productModelUrl', '')} label={t('tab1_remove', 'Remove')} />
                </div>
              </div>
            ) : (
              <UploadZone onClick={() => modelInputRef.current?.click()}
                uploading={uploadTarget === 'productModelUrl'}
                hint={t('tab1_product_model_hint', 'GLB, GLTF — max 50 MB')} icon="box" />
            )}
          </Field>
        </div>

        {/* ── Contact & Links ───────────────────────────────── */}
        <div style={cardSt}>
          <SectionTitle color="var(--blue)" label={t('tab1_section_contact', 'Contact & Links')} />

          <Field label={t('tab1_contact_email', 'Contact Email')}>
            <input type="email" value={form.contactEmail}
              onChange={e => updateField('contactEmail', e.target.value)}
              placeholder="contact@company.com" style={inputSt} />
          </Field>

          <Field label={t('tab1_website_url', 'Website URL')}>
            <input type="text" value={form.websiteUrl}
              onChange={e => updateField('websiteUrl', e.target.value)}
              placeholder="https://www.company.com" style={inputSt} />
          </Field>

          <Field label={t('tab1_ref_links', 'Reference Links')}>
            <textarea value={form.referenceLinks}
              onChange={e => updateField('referenceLinks', e.target.value)}
              placeholder="One URL per line..." style={textareaSt} rows={4} />
            <div style={hintSt}>{t('tab1_ref_links_hint', 'Admin only — one URL per line')}</div>
          </Field>
        </div>

        {/* ── ICP / Legal ── full width ─────────────────────── */}
        <div style={{ ...cardSt, gridColumn: '1 / -1' }}>
          <SectionTitle color="var(--purple)" label={t('tab1_section_icp', 'Intellectual Property & Compliance')} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            <Field label={t('tab1_icp_zh', 'ICP — Chinese')}>
              <input type="text" value={form.icpZh}
                onChange={e => updateField('icpZh', e.target.value)}
                placeholder="粤ICP备2025454823号" style={inputSt} />
              <div style={hintSt}>{t('tab1_icp_zh_hint', 'Shown when Chinese language is selected')}</div>
            </Field>

            <Field label={t('tab1_icp_en', 'ICP — English')}>
              <input type="text" value={form.icpEn}
                onChange={e => updateField('icpEn', e.target.value)}
                placeholder="Guangdong ICP Record No. 2025454823" style={inputSt} />
              <div style={hintSt}>{t('tab1_icp_en_hint', 'Shown for all other languages')}</div>
            </Field>

            <Field label={t('tab1_patent', 'Patent Notice')}>
              <input type="text" value={form.patentNotice}
                onChange={e => updateField('patentNotice', e.target.value)}
                placeholder="Protected by patents: US10,123,456 B2" style={inputSt} />
            </Field>

            <Field label={t('tab1_trademark', 'Trademark Notice')}>
              <input type="text" value={form.trademarkNotice}
                onChange={e => updateField('trademarkNotice', e.target.value)}
                placeholder="Company Name™ is a trademark of..." style={inputSt} />
            </Field>

            <Field label={t('tab1_copyright', 'Copyright Notice')}>
              <input type="text" value={form.copyrightNotice}
                onChange={e => updateField('copyrightNotice', e.target.value)}
                placeholder="© 2024 Company Name. All rights reserved." style={inputSt} />
            </Field>
          </div>
        </div>

      </div>
    </div>
  );
});

ProjectIdentityTab.displayName = 'ProjectIdentityTab';
export default ProjectIdentityTab;
