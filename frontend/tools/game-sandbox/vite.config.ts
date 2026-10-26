import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, normalizePath, type Plugin } from 'vite';

const packagesDir = normalizePath(fileURLToPath(new URL('../../packages/', import.meta.url)));

/**
 * A change to a game, or to a package games run on, reloads the page instead of patching it, so
 * the session restarts with the new code. The URL holds the sandbox's settings, so the same setup
 * comes back. Style changes still update in place.
 */
function reloadOnPackageChange(): Plugin {
  return {
    name: 'learnofun:reload-on-package-change',
    hotUpdate({ file }) {
      if (this.environment.name !== 'client') return;
      if (!file.startsWith(packagesDir) || file.endsWith('.css')) return;
      this.environment.hot.send({ type: 'full-reload' });
      return [];
    },
  };
}

export default defineConfig({
  plugins: [react(), reloadOnPackageChange()],
  server: { port: 5176, strictPort: true },
  // The built sandbox, which the Playwright suites run (ADR 0041).
  preview: { port: 4176, strictPort: true },
});
