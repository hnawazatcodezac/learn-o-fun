import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://localhost:5188';

/** Ten Frame Café's own behaviour, from its brief, in the game sandbox on a port of its own. */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], baseURL, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium' }],
  webServer: {
    // The built sandbox (ADR 0041).
    command:
      'npm run build -w @learnofun/game-sandbox && npm run preview -w @learnofun/game-sandbox -- --port 5188 --strictPort',
    // Playwright resolves this from this file's folder: the frontend workspace.
    cwd: '../../..',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
