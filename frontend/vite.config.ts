import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        // Rewrite the cookie domain so httpOnly cookies set by the backend
        // are stored for localhost (the browser's origin) rather than being
        // dropped when the proxy rewrites the host from :3000 to :8080.
        cookieDomainRewrite: '',
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
