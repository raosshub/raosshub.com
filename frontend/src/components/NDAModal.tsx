import React, { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useI18nStore } from '@/stores/useI18nStore';
import { Icons } from '@/components/icons';

const NDAModal: React.FC = () => {
  const { t } = useI18nStore();
  const { acceptNda, logout } = useAuthStore();
  const [checked, setChecked] = useState(false);

  const handleAgree = useCallback(async () => {
    if (!checked) return;
    await acceptNda();
  }, [checked, acceptNda]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        zIndex: 900,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          boxShadow: 'var(--shadow-lg)',
          width: '100%',
          maxWidth: 680,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'modalIn 0.25s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '22px 28px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-overlay)',
          }}
        >
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
              Non-Disclosure Agreement
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {t('nda_subtitle')}
            </p>
          </div>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              background: 'var(--red-dim)',
              color: 'var(--red)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.5px',
              border: '1px solid var(--red-dim)',
            }}
          >
            REQUIRED
          </span>
        </div>

        {/* Body */}
        <div
          style={{
            padding: '24px 28px',
            overflowY: 'auto',
            maxHeight: '45vh',
            fontSize: 14,
            lineHeight: 1.8,
            color: 'var(--text-secondary)',
          }}
        >
          <ol style={{ paddingLeft: 20 }}>
            <li style={{ marginBottom: 12 }}>
              <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Confidentiality:</strong>{' '}
              All project information, including but not limited to technical specifications, design files,
              source code, and business strategies, is strictly confidential.
            </li>
            <li style={{ marginBottom: 12 }}>
              <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>No Distribution:</strong>{' '}
              You may not share, distribute, or disclose any project materials to third parties without
              prior written consent from RAOSS HK COMPANY LIMITED.
            </li>
            <li style={{ marginBottom: 12 }}>
              <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Access Control:</strong>{' '}
              Access to this platform is granted on a need-to-know basis. Do not share your login
              credentials with anyone.
            </li>
            <li style={{ marginBottom: 12 }}>
              <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Intellectual Property:</strong>{' '}
              All intellectual property rights in the project materials remain the property of RAOSS
              HK COMPANY LIMITED.
            </li>
            <li style={{ marginBottom: 12 }}>
              <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Breach Consequences:</strong>{' '}
              Any breach of this agreement may result in immediate termination of access and legal action.
            </li>
          </ol>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '18px 28px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-overlay)',
          }}
        >
          {/* Checkbox */}
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              fontSize: 13,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              marginBottom: 16,
            }}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              style={{ display: 'none' }}
            />
            <span
              style={{
                width: 18,
                height: 18,
                flexShrink: 0,
                marginTop: 1,
                border: checked ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                borderRadius: 5,
                background: checked ? 'var(--accent)' : 'var(--bg-input)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all var(--transition)',
                fontSize: 11,
                color: 'white',
                fontWeight: 700,
              }}
            >
              {checked ? '✓' : ''}
            </span>
            {t('nda_checkbox')}
          </label>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              onClick={logout}
              style={{
                padding: '9px 18px',
                borderRadius: 'var(--radius-sm)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {t('nda_btn_decline')}
            </button>
            <button
              onClick={handleAgree}
              disabled={!checked}
              style={{
                padding: '9px 18px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent)',
                color: 'var(--text-inverse)',
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: !checked ? 'not-allowed' : 'pointer',
                opacity: !checked ? 0.5 : 1,
                transition: 'opacity var(--transition)',
              }}
            >
              {t('nda_btn_agree')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(NDAModal);
