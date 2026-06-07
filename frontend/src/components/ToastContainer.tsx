import React from 'react';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { Icons } from '@/components/icons';

const typeColors: Record<string, { bg: string; border: string; text: string }> = {
  success: { bg: 'var(--accent-dim)', border: 'rgba(63,185,80,0.25)', text: 'var(--accent)' },
  error:   { bg: 'var(--red-dim)', border: 'rgba(248,81,73,0.25)', text: 'var(--red)' },
  warning: { bg: 'var(--orange-dim)', border: 'rgba(210,153,34,0.25)', text: 'var(--orange)' },
  info:    { bg: 'var(--blue-dim)', border: 'rgba(88,166,255,0.25)', text: 'var(--blue)' },
};

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useNotificationStore();

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 9000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 360,
      }}
    >
      {toasts.map((toast) => {
        const colors = typeColors[toast.type] || typeColors.info;
        return (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            style={{
              background: 'var(--bg-elevated)',
              border: `1px solid ${colors.border}`,
              borderLeft: `3px solid ${colors.text}`,
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              boxShadow: 'var(--shadow-md)',
              cursor: 'pointer',
              animation: 'fadeDown 0.18s ease',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              {toast.title && (
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                  {toast.title}
                </div>
              )}
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {toast.message}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: 14,
                padding: 0,
                lineHeight: 1,
              }}
            >
              <Icons.close size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(ToastContainer);
