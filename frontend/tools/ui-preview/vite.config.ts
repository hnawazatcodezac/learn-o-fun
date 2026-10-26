import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: { port: 5175, strictPort: true },
  // The built preview, which the Playwright suite runs (ADR 0041).
  preview: { port: 4175, strictPort: true },
});
