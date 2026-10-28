import { defineConfig, devices } from '@playwright/test';

/**
 * The test build: bundled as for production, with the development tools the tests use (ADR 0041).
 * It loads in a fraction of the development server's time, so a busy machine does not make a
 * first load miss its wait, and it never reuses a development server the human has open.
 */
const baseURL = 'http://localhost:4174';
/** A production build, for the service worker, which the development server does not use. */
const previewURL = 'http://localhost:4173';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  // Several tests play whole sessions with the real feedback pauses: about 20 seconds, more on a
  // busy machine. The checks are unchanged; this is only the time each test may take.
  timeout: 60_000,
  reporter: 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    {
      name: 'chromium',
      testIgnore: ['**/pwa.e2e.ts', '**/performance.e2e.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'pwa',
      testMatch: '**/pwa.e2e.ts',
      use: { ...devices['Desktop Chrome'], baseURL: previewURL },
    },
    {
      // The performance budgets (ADR 0040): after the other projects and one test at a time, so
      // that nothing else slows a measurement. `--project=performance --no-deps` runs them alone.
      name: 'performance',
      testMatch: '**/performance.e2e.ts',
      dependencies: ['chromium', 'pwa'],
      fullyParallel: false,
      workers: 1,
      use: { ...devices['Desktop Chrome'], baseURL: previewURL },
    },
  ],
  webServer: [
    {
      command: 'npm run build:e2e && npm run preview:e2e -- --port 4174 --strictPort',
      url: baseURL,
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: 'npm run build && npm run preview',
      url: previewURL,
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});
