import React, { useState, useEffect, useRef, useCallback, useImperativeHandle } from 'react';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useConfigStore } from '@/stores/useConfigStore';
import { configApi, fileApi } from '@/utils/api';
import { Icons } from '@/components/icons';

/* ─── Styles ─────────────────────────────────────────────────── */
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
  letterSpacing: '0.5px', textTransform: 'uppercase',
  marginBottom: 6, display: 'block',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)', background: 'var(--bg-input)',
  color: 'var(--text-primary)', fontSize: 13, outline: 'none',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

const textareaStyle: React.CSSProperties = {
  ...inputStyle, minHeight: 80, resize: 'vertical', fontFamily: 'inherit',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: 20,
};

const sectionTitle = (accentColor: string, label: string) => (
  <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
    <span style={{ width: 4, height: 16, background: accentColor, borderRadius: 2 }} />
    {label}
  </h3>
);

/* ─── Status color map ───────────────────────────────────────── */
const STATUS_COLORS: Record<string, string> = {
  planning: '#6b7280', development: '#3b82f6', prototype: '#f59e0b',
  production: '#10b981', maintenance: '#8b5cf6', completed: '#059669',
};

/* ─── Types ──────────────────────────────────────────────────── */
interface IdentityForm {
  projectName: string;
  companyName: string;
  productCode: string;
  status: string;
  description: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  productImages: string[];
  productModelUrl: string;
  contactEmail: string;
  websiteUrl: string;
  referenceLinks: string;
  copyrightNotice: string;
  trademarkNotice: string;
  patentNotice: string;
  icpZh: string;
  icpEn: string;
}

const defaultForm: IdentityForm = {
  projectName: '', companyName: '', productCode: '', status: 'planning',
  description: '', logoUrl: '', faviconUrl: '', primaryColor: '#4f46e5',
  productImages: [], productModelUrl: '', contactEmail: '', websiteUrl: '',
  referenceLinks: '', copyrightNotice: '', trademarkNotice: '', patentNotice: '',
  icpZh: '', icpEn: '',
};

/* ─── Component ──────────────────────────────────────────────── */
export interface ProjectIdentityTabHandle {
  save: () => void;
  reset: () => void;
  getData: () => IdentityForm;
  hasChanges: boolean;
  saving: boolean;
}

interface ProjectIdentityTabProps {
  onStateChange?: (hasChanges: boolean, saving: boolean) => void;
}

const ProjectIdentityTab = React.forwardRef<ProjectIdentityTabHandle, ProjectIdentityTabProps>(({ onStateChange }, ref) => {
  const { addToast } = useNotificationStore();
  const [form, setForm] = useState<IdentityForm>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);

  /* ─── Notify parent of state changes ─────────────────────── */
  useEffect(() => {
    onStateChange?.(hasChanges, saving);
  }, [hasChanges, saving, onStateChange]);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const productImgInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);

  /* ─── Load ─────────────────────────────────────────────────── */
  useEffect(() => {
    console.log('[Load] Fetching config...');
    configApi.get().then((res) => {
      console.log('[Load] Got config:', res.data);
      const identity = res.data?.data?.identity || {};
      if (identity && Object.keys(identity).length > 0) {
        setForm((prev) => ({ ...prev, ...identity }));
      }
      setLoading(false);
    }).catch((err) => {
      console.error('[Load] Failed:', err.response?.status);
      setLoading(false);
    });
  }, []);

  const updateField = useCallback((field: keyof IdentityForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  /* ─── File Upload ────────────────────────────────────────── */
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>, field: string, accept: string, maxSizeMB: number) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > maxSizeMB * 1024 * 1024) {
        addToast(`File too large. Max ${maxSizeMB}MB.`, 'error'); return;
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
            updateField(field as keyof IdentityForm, url);
          }
          addToast('Uploaded successfully', 'success');
        }
      } catch { addToast('Upload failed', 'error'); }
      setUploadTarget(null);
      e.target.value = '';
    },
    [addToast, updateField]
  );

  const removeImage = (idx: number) => {
    setForm((prev) => ({ ...prev, productImages: prev.productImages.filter((_, i) => i !== idx) }));
    setHasChanges(true);
  };

  /* ─── Save handler (MUST be defined BEFORE useImperativeHandle) ─ */
  const handleSave = useCallback(async () => {
    setSaving(true);
    console.log('[Save] Sending:', JSON.stringify(form, null, 2));
    try {
      const res = await configApi.save({ identity: form });
      console.log('[Save] Success:', res.data);
      setHasChanges(false);
      useConfigStore.getState().load();
      addToast('Configuration saved successfully', 'success');
    } catch (err: any) {
      console.error('[Save] Failed:', err.response?.status, err.response?.data);
      addToast('Save failed: ' + (err.response?.data?.message || err.response?.status || 'network error'), 'error');
    }
    setSaving(false);
  }, [form, addToast]);

  const handleReset = useCallback(() => {
    if (!window.confirm('Reset all to defaults?')) return;
    setForm(defaultForm); setHasChanges(true);
  }, []);

  /* ─── Expose to parent ───────────────────────────────────── */
  useImperativeHandle(ref, () => ({
    save: handleSave,
    reset: handleReset,
    getData: () => form,
    get hasChanges() { return hasChanges; },
    get saving() { return saving; },
  }), [handleSave, handleReset, form, hasChanges, saving]);

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, fontSize: 13, color: 'var(--text-muted)' }}>Loading...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Project Identity &amp; Branding</h2>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Define your product identity, branding, and legal notices.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>

        {/* ─── Basic Information ──────────────────────────────── */}
        <div style={cardStyle}>
          {sectionTitle('var(--accent)', 'Basic Information')}

          <Field label="Project Name *">
            <input type="text" value={form.projectName} onChange={(e) => updateField('projectName', e.target.value)} placeholder="e.g., Smart Home Hub Pro" style={inputStyle} />
          </Field>

          <Field label="Product Code / SKU">
            <input type="text" value={form.productCode} onChange={(e) => updateField('productCode', e.target.value)} placeholder="e.g., RSH-2024-001" style={inputStyle} />
          </Field>

          <Field label="Company Name *">
            <input type="text" value={form.companyName} onChange={(e) => updateField('companyName', e.target.value)} placeholder="e.g., RAOSS Technologies" style={inputStyle} />
          </Field>

          <Field label="Status">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <select value={form.status} onChange={(e) => updateField('status', e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                <option value="planning">Planning</option>
                <option value="development">In Development</option>
                <option value="prototype">Prototype</option>
                <option value="production">Production</option>
                <option value="maintenance">Maintenance</option>
                <option value="completed">Completed</option>
              </select>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: STATUS_COLORS[form.status] || '#6b7280', flexShrink: 0 }} />
            </div>
          </Field>

          <Field label="Description">
            <textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} placeholder="Brief product description..." style={textareaStyle} rows={4} />
          </Field>
        </div>

        {/* ─── Branding ───────────────────────────────────────── */}
        <div style={cardStyle}>
          {sectionTitle('var(--orange)', 'Branding')}

          <Field label="Logo">
            <input ref={logoInputRef} type="file" accept=".jpg,.jpeg,.png,.svg,.webp" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'logoUrl', '.jpg,.jpeg,.png,.svg,.webp', 10)} />
            {form.logoUrl ? (
              <div>
                <img src={form.logoUrl} alt="Logo" style={{ maxHeight: 60, maxWidth: 180, objectFit: 'contain', borderRadius: 'var(--radius-sm)' }} />
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <SmallBtn onClick={() => logoInputRef.current?.click()} label="Change" uploading={uploadTarget === 'logoUrl'} />
                  <DangerBtn onClick={() => updateField('logoUrl', '')} label="Remove" />
                </div>
              </div>
            ) : <UploadZone onClick={() => logoInputRef.current?.click()} uploading={uploadTarget === 'logoUrl'} text="JPG, PNG, SVG, WebP — max 10MB" iconName="image" />}
          </Field>

          <Field label="Favicon">
            <input ref={faviconInputRef} type="file" accept=".ico,.png,.svg" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'faviconUrl', '.ico,.png,.svg', 5)} />
            {form.faviconUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src={form.faviconUrl} alt="Favicon" style={{ width: 32, height: 32, borderRadius: 4, border: '1px solid var(--border)' }} />
                <SmallBtn onClick={() => faviconInputRef.current?.click()} label="Change" uploading={uploadTarget === 'faviconUrl'} />
                <DangerBtn onClick={() => updateField('faviconUrl', '')} label="Remove" />
              </div>
            ) : <UploadZone onClick={() => faviconInputRef.current?.click()} uploading={uploadTarget === 'faviconUrl'} text="ICO, PNG, SVG — max 5MB" iconName="pin" />}
          </Field>

          <Field label="Primary Color">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="color" value={form.primaryColor} onChange={(e) => updateField('primaryColor', e.target.value)} style={{ width: 44, height: 36, padding: 2, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'var(--bg-input)' }} />
              <input type="text" value={form.primaryColor} onChange={(e) => updateField('primaryColor', e.target.value)} placeholder="#4f46e5" style={{ ...inputStyle, flex: 1 }} />
              <div style={{ width: 24, height: 24, borderRadius: 4, background: form.primaryColor, border: '1px solid var(--border)' }} />
            </div>
          </Field>
        </div>

        {/* ─── Product Visuals ────────────────────────────────── */}
        <div style={cardStyle}>
          {sectionTitle('var(--green)', 'Product Visuals')}

          <Field label={`Product Images (${form.productImages.length}/10)`}>
            <input ref={productImgInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'productImages', '.jpg,.jpeg,.png,.webp', 10)} />

            {form.productImages.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                {form.productImages.map((url, idx) => (
                  <div key={idx} style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <img src={url} alt={`Product ${idx + 1}`} style={{ width: '100%', height: 80, objectFit: 'cover' }} />
                    <button onClick={() => removeImage(idx)} style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'var(--red)', color: 'white', border: 'none', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>X</button>
                  </div>
                ))}
              </div>
            )}

            {form.productImages.length < 10 && (
              <UploadZone onClick={() => productImgInputRef.current?.click()} uploading={uploadTarget === 'productImages'} text={`${10 - form.productImages.length} slots left — JPG, PNG, WebP`} iconName="camera" />
            )}
          </Field>

          <Field label="3D Model (.glb)">
            <input ref={modelInputRef} type="file" accept=".glb,.gltf" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'productModelUrl', '.glb,.gltf', 50)} />
            {form.productModelUrl ? (
              <div style={{ padding: 12, background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>3D Model Uploaded</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', wordBreak: 'break-all', marginBottom: 8 }}>{form.productModelUrl}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <SmallBtn onClick={() => modelInputRef.current?.click()} label="Replace" uploading={uploadTarget === 'productModelUrl'} />
                  <DangerBtn onClick={() => updateField('productModelUrl', '')} label="Remove" />
                </div>
              </div>
            ) : <UploadZone onClick={() => modelInputRef.current?.click()} uploading={uploadTarget === 'productModelUrl'} text="GLB, GLTF — max 50MB" iconName="box" />}
          </Field>
        </div>

        {/* ─── Contact & Links ────────────────────────────────── */}
        <div style={cardStyle}>
          {sectionTitle('var(--blue)', 'Contact & Links')}

          <Field label="Contact Email">
            <input type="email" value={form.contactEmail} onChange={(e) => updateField('contactEmail', e.target.value)} placeholder="contact@company.com" style={inputStyle} />
          </Field>

          <Field label="Website URL">
            <input type="text" value={form.websiteUrl} onChange={(e) => updateField('websiteUrl', e.target.value)} placeholder="https://www.company.com" style={inputStyle} />
          </Field>

          <Field label="Reference Links (admin only)">
            <textarea value={form.referenceLinks} onChange={(e) => updateField('referenceLinks', e.target.value)} placeholder="One URL per line..." style={textareaStyle} rows={4} />
          </Field>
        </div>

        {/* ─── ICP (Intellectual Property & Compliance) ───────── */}
        <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
          {sectionTitle('var(--purple)', 'ICP (Intellectual Property & Compliance)')}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            <Field label="ICP — Chinese (shown when ZH selected)">
              <input type="text" value={form.icpZh} onChange={(e) => updateField('icpZh', e.target.value)} placeholder="粤ICP备2025454823号" style={inputStyle} />
            </Field>

            <Field label="ICP — English (shown for all other languages)">
              <input type="text" value={form.icpEn} onChange={(e) => updateField('icpEn', e.target.value)} placeholder="Guangdong ICP Record No. 2025454823" style={inputStyle} />
            </Field>

            <Field label="Copyright Notice">
              <input type="text" value={form.copyrightNotice} onChange={(e) => updateField('copyrightNotice', e.target.value)} placeholder="© 2024 Company Name. All rights reserved." style={inputStyle} />
            </Field>

            <Field label="Trademark Notice">
              <input type="text" value={form.trademarkNotice} onChange={(e) => updateField('trademarkNotice', e.target.value)} placeholder="Company Name™ is a trademark of..." style={inputStyle} />
            </Field>

            <Field label="Patent Notice">
              <input type="text" value={form.patentNotice} onChange={(e) => updateField('patentNotice', e.target.value)} placeholder="Protected by patents: US10,123,456 B2" style={inputStyle} />
            </Field>
          </div>
        </div>

      </div>

      {/* Save button is now in AdminSetupPage left column */}
    </div>
  );
});

/* ─── Sub-Components ─────────────────────────────────────────── */
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}><label style={labelStyle}>{label}</label>{children}</div>
);

const UploadZone: React.FC<{ onClick: () => void; uploading: boolean; text: string; iconName: keyof typeof Icons }> = ({ onClick, uploading, text, iconName }) => (
  <button onClick={onClick} disabled={uploading} style={{ width: '100%', padding: '20px 16px', borderRadius: 'var(--radius-sm)', border: '2px dashed var(--border)', background: 'var(--bg-base)', color: 'var(--text-muted)', cursor: uploading ? 'wait' : 'pointer', textAlign: 'center' }}>
    <div style={{ fontSize: 20, marginBottom: 4, color: uploading ? 'var(--accent)' : 'var(--text-muted)' }}>
      {uploading ? '...' : React.createElement(Icons[iconName] || Icons.upload, { size: 24 })}
    </div>
    <div style={{ fontSize: 12, fontWeight: 600 }}>{uploading ? 'Uploading...' : 'Click to upload'}</div>
    <div style={{ fontSize: 10, marginTop: 2, opacity: 0.7 }}>{text}</div>
  </button>
);

const SmallBtn: React.FC<{ onClick: () => void; label: string; uploading?: boolean }> = ({ onClick, label, uploading }) => (
  <button onClick={onClick} disabled={uploading} style={{ padding: '6px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-base)', color: 'var(--text-secondary)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, cursor: uploading ? 'wait' : 'pointer' }}>{uploading ? '...' : label}</button>
);

const DangerBtn: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
  <button onClick={onClick} style={{ padding: '6px 14px', borderRadius: 'var(--radius-sm)', background: 'none', color: 'var(--red)', border: '1px solid var(--red)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{label}</button>
);

export default React.memo(ProjectIdentityTab) as React.ForwardRefExoticComponent<React.RefAttributes<ProjectIdentityTabHandle>>;
