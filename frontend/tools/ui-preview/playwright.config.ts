import { defineConfig, devices } from '@playwright/test';

/**
 * The suite runs the built preview (ADR 0041). The screenshot tests stay on the development server
 * until they are checked against the build in Docker (FRONTEND-KICKOFF 15d): `npm run visual` and
 * CI's screenshot job set LEARNOFUN_SCREENSHOTS.
 */
const screenshots = process.env.LEARNOFUN_SCREENSHOTS === '1';
const baseURL = screenshots ? 'http://localhost:5175' : 'http://localhost:4175';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  reporter: 'list',
  // One set of screenshots for every machine, so no platform in the file name (ADR 0006).
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    {
      name: 'chromium',
      testIgnore: '**/visual.e2e.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Run with `npm run visual`, which points it at the browser in Playwright's Docker image.
      name: 'visual',
      testMatch: '**/visual.e2e.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: screenshots
    ? { command: 'npm run dev', url: baseURL, reuseExistingServer: true }
    : {
        command: 'npm run build && npm run preview',
        url: baseURL,
        reuseExistingServer: false,
        timeout: 180_000,
      },
});
