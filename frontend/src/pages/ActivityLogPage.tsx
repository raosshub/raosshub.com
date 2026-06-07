import React, { useState, useEffect } from 'react';
import { useI18nStore } from '@/stores/useI18nStore';
import { auditApi } from '@/utils/api';
import { Icons } from '@/components/icons';
import type { AuditLogEntry } from '@/types';

const ActivityLogPage: React.FC = () => {
  const { t } = useI18nStore();

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pageSize = 20;

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { page, size: pageSize };
      if (action) params.action = action;
      if (from) params.from = from;
      if (to) params.to = to;

      const res = await auditApi.getLogs(params);
      setLogs(res.data.data.content || []);
      setTotalPages(res.data.data.totalPages || 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load audit log');
    }
    setLoading(false);
  };

  const exportCSV = () => {
    const headers = ['ID', 'Time', 'User', 'Action', 'Resource', 'Detail (EN)', 'IP'];
    const rows = logs.map((l) => [
      l.id, l.createdAt, l.username, l.action, l.resource, l.detailEn || '', l.ipAddress || '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const actionOptions = [
    { value: '', label: t('filter_all_actions') },
    { value: 'login', label: t('filter_login') },
    { value: 'logout', label: t('filter_logout') },
    { value: 'upload', label: t('filter_upload') },
    { value: 'delete', label: t('filter_delete') },
    { value: 'update', label: t('filter_update') },
    { value: 'create', label: t('filter_create') },
  ];

  const actionColors: Record<string, { bg: string; text: string }> = {
    login: { bg: 'var(--accent-dim)', text: 'var(--accent)' },
    logout: { bg: 'var(--blue-dim)', text: 'var(--blue)' },
    upload: { bg: 'var(--purple-dim)', text: 'var(--purple)' },
    delete: { bg: 'var(--red-dim)', text: 'var(--red)' },
    update: { bg: 'var(--orange-dim)', text: 'var(--orange)' },
    create: { bg: 'var(--cyan-dim)', text: 'var(--cyan)' },
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
            {t('tool_activity_log')}
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
            Recent activity across the HUB
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16,
        padding: 14, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
      }}>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          style={{
            padding: '7px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
            background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 12, outline: 'none',
          }}
        >
          {actionOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          style={{
            padding: '7px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
            background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 12, outline: 'none',
          }}
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          style={{
            padding: '7px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
            background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 12, outline: 'none',
          }}
        />
        <button
          onClick={fetchLogs}
          style={{
            padding: '7px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)',
            color: 'var(--text-inverse)', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <Icons.search size={14} /> {t('btn_filter')}
        </button>
        <button
          onClick={exportCSV}
          disabled={logs.length === 0}
          style={{
            padding: '7px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-overlay)',
            color: 'var(--text-secondary)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 500,
            cursor: logs.length === 0 ? 'not-allowed' : 'pointer', opacity: logs.length === 0 ? 0.5 : 1,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <Icons.download size={14} /> {t('btn_export_csv')}
        </button>
      </div>

      {/* Logs table */}
      <div style={{
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--border)',
              borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
            }} />
            {t('audit_loading')}
          </div>
        ) : error ? (
          <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--red)', fontSize: 13 }}>
            {error}
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            {t('audit_empty')}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg-overlay)', borderBottom: '1px solid var(--border)' }}>
                  {['Time', 'User', 'Action', 'Resource', 'Detail', 'IP'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const ac = actionColors[log.action] || { bg: 'var(--bg-hover)', text: 'var(--text-secondary)' };
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background var(--transition)' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {log.username}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                          background: ac.bg, color: ac.text, textTransform: 'uppercase', letterSpacing: '0.3px',
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                        {log.resource}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.detailEn || '-'}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 11 }}>
                        {log.ipAddress || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '12px 16px', borderTop: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{
                padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                background: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: 12, cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.5 : 1,
              }}
            >
              {t('btn_prev')}
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={{
                padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                background: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: 12, cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.5 : 1,
              }}
            >
              {t('btn_next')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(ActivityLogPage);
