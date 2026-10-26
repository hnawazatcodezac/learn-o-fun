/** @type {import('stylelint').Config} */
export default {
  plugins: ['stylelint-use-logical'],
  ignoreFiles: [
    '**/node_modules/**',
    '**/dist/**',
    '**/coverage/**',
    '**/playwright-report/**',
    '**/test-results/**',
  ],
  rules: {
    // Logical properties only, so layouts mirror in right-to-left locales (plan 7.2, CLAUDE.md rule 5).
    'csstools/use-logical': 'always',
  },
};
