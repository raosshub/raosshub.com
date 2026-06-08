// Self-hosted fonts — imported here so Vite bundles the woff2 files
// into the dist output. No external CDN requests at runtime.
// Requires: npm install (package.json already has @fontsource/dm-sans and @fontsource/dm-mono)
import '@fontsource/dm-sans/300.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/dm-sans/300-italic.css';
import '@fontsource/dm-mono/400.css';
import '@fontsource/dm-mono/500.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
