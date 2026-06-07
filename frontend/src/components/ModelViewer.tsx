import React, { useEffect, useRef } from 'react';

/**
 * 3D Model Viewer using @google/model-viewer via CDN.
 * Loads the web component script dynamically.
 */
const ModelViewer: React.FC<{ src: string; alt?: string }> = ({ src, alt = '3D Model' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load model-viewer script if not already loaded
    if (!customElements.get('model-viewer')) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://unpkg.com/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
      document.head.appendChild(script);
    }
  }, []);

  if (!src) return null;

  return (
    <div ref={containerRef} style={{ width: '100%', height: 300, borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
      {/* @ts-ignore — model-viewer is a web component */}
      <model-viewer
        src={src}
        alt={alt}
        auto-rotate
        camera-controls
        rotation-per-second="30deg"
        shadow-intensity="1"
        exposure="0.8"
        style={{ width: '100%', height: '100%', background: 'var(--bg-elevated)' }}
      />
    </div>
  );
};

export default React.memo(ModelViewer);
