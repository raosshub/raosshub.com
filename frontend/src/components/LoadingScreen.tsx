import React from 'react';

interface LoadingScreenProps {
  text?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ text = 'Initialising...' }) => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'var(--bg-base)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'opacity 0.4s ease',
    }}
  >
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: '-0.5px',
          color: 'var(--text-primary)',
          marginBottom: 32,
        }}
      >
        The <span style={{ color: 'var(--accent)' }}>HUB</span>
      </div>
      <div
        style={{
          width: 180,
          height: 3,
          background: 'var(--border)',
          borderRadius: 99,
          margin: '0 auto 16px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            height: '100%',
            background: 'var(--accent)',
            borderRadius: 99,
            width: '40%',
            position: 'absolute',
            animation: 'loadShimmer 1.4s ease-in-out infinite',
          }}
        />
      </div>
      <div
        style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          letterSpacing: '0.5px',
        }}
      >
        {text}
      </div>
    </div>
  </div>
);

export default React.memo(LoadingScreen);
