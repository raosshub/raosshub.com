import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useI18nStore } from '@/stores/useI18nStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { fileApi } from '@/utils/api';
import { Icons } from '@/components/icons';
import type { GalleryImage, TeamFile, PdfDocument } from '@/types';

const TeamPage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const { t, localeContent, currentLang, getTeamName } = useI18nStore();
  const { addToast } = useNotificationStore();

  const [activeTab, setActiveTab] = useState('scope');
  const [teamData, setTeamData] = useState<any>({});
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [files, setFiles] = useState<TeamFile[]>([]);
  const [pdfs, setPdfs] = useState<PdfDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showPdfUpload, setShowPdfUpload] = useState(false);
  const [pdfTitle, setPdfTitle] = useState('');

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const teamName = getTeamName(teamId || '');

  // ─── Load team data ──────────────────────────────────────────
  useEffect(() => {
    if (!teamId) return;

    const sections = (localeContent as any)?.sections || {};
    setTeamData(sections[teamId] || {});

    // Load gallery
    fileApi.getGallery(teamId).then((res) => setGallery(res.data.data || [])).catch(() => {});

    // Load files
    fileApi.getTeamFiles(teamId).then((res) => setFiles(res.data.data || [])).catch(() => {});

    // Load PDFs
    fileApi.getPdfDocuments(teamId).then((res) => setPdfs(res.data.data || [])).catch(() => {});
  }, [teamId, localeContent]);

  // ─── Upload handlers ─────────────────────────────────────────
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !teamId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fileApi.uploadGallery(teamId, formData);
      setGallery((prev) => [res.data.data, ...prev]);
      addToast('Image uploaded', 'success');
    } catch (err) {
      addToast('Upload failed', 'error');
    }
    setUploading(false);
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !teamId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fileApi.uploadTeamFile(teamId, formData);
      setFiles((prev) => [res.data.data, ...prev]);
      addToast('File uploaded', 'success');
    } catch (err) {
      addToast('Upload failed', 'error');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !teamId || !pdfTitle.trim()) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', pdfTitle.trim());
      const res = await fileApi.uploadPdf(teamId, formData);
      setPdfs((prev) => [res.data.data, ...prev]);
      addToast('PDF uploaded', 'success');
      setShowPdfUpload(false);
      setPdfTitle('');
    } catch (err) {
      addToast('Upload failed', 'error');
    }
    setUploading(false);
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  };

  // ─── Delete handlers ─────────────────────────────────────────
  const deleteGalleryImage = async (id: number) => {
    try {
      await fileApi.deleteGalleryImage(id);
      setGallery((prev) => prev.filter((g) => g.id !== id));
      addToast('Image deleted', 'success');
    } catch {
      addToast('Delete failed', 'error');
    }
  };

  const deleteTeamFile = async (id: number) => {
    try {
      await fileApi.deleteTeamFile(id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
      addToast('File deleted', 'success');
    } catch {
      addToast('Delete failed', 'error');
    }
  };

  const deletePdf = async (id: number) => {
    try {
      await fileApi.deletePdf(id);
      setPdfs((prev) => prev.filter((p) => p.id !== id));
      addToast('PDF removed', 'success');
    } catch {
      addToast('Delete failed', 'error');
    }
  };

  // ─── Tabs ────────────────────────────────────────────────────
  const tabs = [
    { id: 'scope', label: t('tab_scope'), icon: 'target' as const },
    { id: 'deliverables', label: t('tab_deliverables'), icon: 'package' as const },
    { id: 'files', label: t('tab_files'), icon: 'folder' as const },
    { id: 'pdf', label: t('tab_pdf'), icon: 'document' as const },
    { id: 'gallery', label: t('tab_gallery'), icon: 'image' as const },
  ];

  const scope = teamData?.scope || {};
  const deliverables = teamData?.deliverables || [];

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      Done: 'var(--accent)', 'In Progress': 'var(--orange)', Planned: 'var(--text-muted)',
      Approved: 'var(--accent)', Rejected: 'var(--red)', 'On Hold': 'var(--orange)',
    };
    return map[s] || 'var(--text-muted)';
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20,
        padding: 20, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, background: 'var(--accent-dim)', color: 'var(--accent)',
        }}>
          {React.createElement((Icons as any)[teamId || 'box'] || Icons.box, { size: 22 })}
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{teamName}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Team ID: {teamId}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, flexWrap: 'nowrap', marginBottom: 16, overflowX: 'auto', background: 'none' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '7px 12px', fontSize: 12, fontWeight: activeTab === tab.id ? 700 : 500,
              border: 'none', background: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
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

      {/* ─── Scope Tab ─────────────────────────────────────────── */}
      {activeTab === 'scope' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
              Scope Description
            </h3>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
              {scope.description || 'No scope description available. Use HUB Assist to generate scope content.'}
            </p>
            {scope.description_zh && currentLang === 'zh' && (
              <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                {scope.description_zh}
              </p>
            )}
          </div>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
              Key Details
            </h3>
            {scope.name && (
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Name</span>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{scope.name}</p>
              </div>
            )}
            {scope.responsible && (
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Responsible</span>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{scope.responsible}</p>
              </div>
            )}
            {scope.timeline && (
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Timeline</span>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{scope.timeline}</p>
              </div>
            )}
            {scope.challenges && (
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Challenges</span>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{scope.challenges}</p>
              </div>
            )}
            {!scope.name && !scope.description && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No scope details available.</p>
            )}
          </div>
        </div>
      )}

      {/* ─── Deliverables Tab ──────────────────────────────────── */}
      {activeTab === 'deliverables' && (
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          {deliverables.length === 0 ? (
            <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No deliverables available. Use HUB Assist to generate deliverables.
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {deliverables.map((d: any, i: number) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', padding: '12px 18px',
                  borderBottom: i < deliverables.length - 1 ? '1px solid var(--border-subtle)' : 'none', gap: 12,
                }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: d.status === 'Done' ? 'var(--accent-dim)' : 'var(--blue-dim)',
                    color: d.status === 'Done' ? 'var(--accent)' : 'var(--blue)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, flexShrink: 0,
                  }}>
                    {i + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.deliverable || d.name || 'Untitled'}
                    </div>
                    {d.description && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.description}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                    background: `var(--${d.status === 'Done' ? 'accent' : d.status === 'In Progress' ? 'orange' : 'blue'}-dim)`,
                    color: statusColor(d.status), flexShrink: 0,
                  }}>
                    {d.status || 'Planned'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Files Tab ─────────────────────────────────────────── */}
      {activeTab === 'files' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                padding: '8px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)',
                color: 'var(--text-inverse)', border: 'none', fontSize: 13, fontWeight: 600,
                cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Icons.upload size={14} />
              {uploading ? 'Uploading...' : 'Upload File'}
            </button>
          </div>

          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            {files.length === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No files uploaded yet.
              </div>
            ) : (
              <div>
                {files.map((f) => (
                  <div key={f.id} style={{
                    display: 'flex', alignItems: 'center', padding: '12px 18px',
                    borderBottom: '1px solid var(--border-subtle)', gap: 12,
                  }}>
                    <Icons.document size={18} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.fileName}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                        {(f.fileSize / 1024).toFixed(1)} KB · {f.uploadedBy}
                      </div>
                    </div>
                    <button onClick={() => deleteTeamFile(f.id)} style={{
                      background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12,
                    }}>
                      <Icons.trash size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── PDF Tab ───────────────────────────────────────────── */}
      {activeTab === 'pdf' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <input type="file" ref={pdfInputRef} accept=".pdf" onChange={handlePdfUpload} style={{ display: 'none' }} />
            <button
              onClick={() => setShowPdfUpload(!showPdfUpload)}
              style={{
                padding: '8px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)',
                color: 'var(--text-inverse)', border: 'none', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Icons.document size={14} />
              Upload PDF
            </button>
          </div>

          {showPdfUpload && (
            <div style={{
              background: 'var(--bg-overlay)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: 16, marginBottom: 16,
            }}>
              <input
                type="text"
                value={pdfTitle}
                onChange={(e) => setPdfTitle(e.target.value)}
                placeholder="PDF Title"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)', background: 'var(--bg-input)',
                  color: 'var(--text-primary)', fontSize: 13, marginBottom: 12, outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => pdfInputRef.current?.click()} style={{
                  padding: '8px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--blue)',
                  color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>
                  Choose PDF
                </button>
                <button onClick={() => { setShowPdfUpload(false); setPdfTitle(''); }} style={{
                  padding: '8px 16px', borderRadius: 'var(--radius-sm)', background: 'none',
                  color: 'var(--text-secondary)', border: '1px solid var(--border)', fontSize: 12, cursor: 'pointer',
                }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            {pdfs.length === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No PDF documents uploaded yet.
              </div>
            ) : (
              <div>
                {pdfs.map((p) => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', padding: '12px 18px',
                    borderBottom: '1px solid var(--border-subtle)', gap: 12,
                  }}>
                    <Icons.document size={18} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.title}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                        {(p.fileSize / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <button onClick={() => deletePdf(p.id)} style={{
                      background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12,
                    }}>
                      <Icons.trash size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Gallery Tab ───────────────────────────────────────── */}
      {activeTab === 'gallery' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <input type="file" ref={galleryInputRef} accept="image/*" onChange={handleGalleryUpload} style={{ display: 'none' }} />
            <button
              onClick={() => galleryInputRef.current?.click()}
              disabled={uploading}
              style={{
                padding: '8px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)',
                color: 'var(--text-inverse)', border: 'none', fontSize: 13, fontWeight: 600,
                cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Icons.upload size={14} />
              {uploading ? 'Uploading...' : 'Upload Image'}
            </button>
          </div>

          {gallery.length === 0 ? (
            <div style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '32px 24px',
              textAlign: 'center', color: 'var(--text-muted)', fontSize: 13,
            }}>
              No images in gallery yet.
            </div>
          ) : (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12,
            }}>
              {gallery.map((img) => (
                <div key={img.id} style={{
                  borderRadius: 'var(--radius)', overflow: 'hidden',
                  border: '1px solid var(--border)', background: 'var(--bg-elevated)',
                  position: 'relative',
                }}>
                  <img
                    src={img.s3Url}
                    alt={img.fileName}
                    style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%2330363d" width="100" height="100"/><text fill="%238b949e" x="50" y="50" text-anchor="middle" font-size="12">Image</text></svg>';
                    }}
                  />
                  <div style={{
                    padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {img.fileName}
                    </span>
                    <button onClick={() => deleteGalleryImage(img.id)} style={{
                      background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12,
                    }}>
                      <Icons.trash size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(TeamPage);
