import { defineConfig } from 'vitest/config';

/** `npm run sim`: the release gates over the synthetic learners (plan 4.6, ADR 0031). */
export default defineConfig({
  test: {
    include: ['src/**/*.sim.ts'],
    testTimeout: 600_000,
    // The report is the point: print it even when the gates pass.
    silent: false,
  },
});
