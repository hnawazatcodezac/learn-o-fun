import { defineConfig } from 'vitest/config';

/*
 * learning-core's property tests are CPU-bound: about a second each alone, several times that when
 * every package's tests run at once (`npm test`). A longer limit keeps them from timing out under
 * that load; it changes no check.
 */
export default defineConfig({
  test: {
    testTimeout: 20_000,
  },
});
