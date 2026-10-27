/** @type {import('stylelint').Config} */
export default {
  plugins: ['stylelint-use-logical'],
  ignoreFiles: [
    '**/node_modules/**',
    '**/dist/**',
    '**/dist-e2e/**',
    // Next.js's build and its static exports (ADR 0042), as in eslint.config.js.
    '**/.next/**',
    '**/out/**',
    '**/out-e2e/**',
    '**/coverage/**',
    '**/playwright-report/**',
    '**/test-results/**',
  ],
  rules: {
    // Logical properties only, so layouts mirror in right-to-left locales (plan 7.2, CLAUDE.md rule 5).
    'csstools/use-logical': 'always',
  },
};
