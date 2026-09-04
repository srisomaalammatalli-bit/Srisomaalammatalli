import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import devApiPlugin from './dev-api-plugin.js';
import { loadEnv } from './database/env.js';

/**
 * Load .env into process.env for the dev server only.
 *
 * These values are read by the API handlers running inside the dev middleware
 * (DATABASE_URL, SESSION_SECRET, …). They are deliberately NOT prefixed with
 * VITE_, so Vite never inlines them into the browser bundle — secrets stay
 * server-side. On Vercel the platform supplies them instead.
 */
loadEnv();

export default defineConfig({
  plugins: [
    react(),
    // Serves api/* locally the way Vercel serves it in production.
    devApiPlugin()
  ],
  server: {
    port: 5173,
    open: false
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
