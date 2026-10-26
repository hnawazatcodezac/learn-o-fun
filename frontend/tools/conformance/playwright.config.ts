import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import { SANDBOX_PORT, SANDBOX_URL, SHELL_PORT, SHELL_URL } from './e2e/servers';

const frontend = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  // A play-through is a whole session with the real feedback pauses: about 20 seconds, more on a
  // busy machine. The checks are unchanged; this is only the time each test may take.
  timeout: 60_000,
  fullyParallel: true,
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], trace: 'retain-on-failure' },
  projects: [{ name: 'chromium' }],
  // The web app's test build and the built sandbox (ADR 0041).
  webServer: [
    {
      command: `npm run build:e2e -w @learnofun/web && npm run preview:e2e -w @learnofun/web -- --port ${String(SHELL_PORT)} --strictPort`,
      cwd: frontend,
      url: SHELL_URL,
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: `npm run build -w @learnofun/game-sandbox && npm run preview -w @learnofun/game-sandbox -- --port ${String(SANDBOX_PORT)} --strictPort`,
      cwd: frontend,
      url: SANDBOX_URL,
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
