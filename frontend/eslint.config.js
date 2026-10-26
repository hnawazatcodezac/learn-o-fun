import { builtinModules } from 'node:module';
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import { createNodeResolver, importX } from 'eslint-plugin-import-x';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const appAllow = ['contracts', 'learning-core', 'i18n', 'ui-kit', 'game-sdk', 'mock-api', 'game-*'];

// The web app's child and parent areas never import each other; shared code lives in packages or
// apps/web/src/shared. This keeps parent-dashboard code out of the child area (ADR 0007).
const areaMessage = (from, to) =>
  `The ${from} area must not import ${to}-area code (ADR 0007). Move shared code to a package or to apps/web/src/shared.`;

// Which @learnofun packages each part of the workspace may import. Any other @learnofun import is a
// boundary violation. Pure packages also may not import React or Node built-ins (CLAUDE.md rule 2).
// Later entries override earlier ones for the files they match.
const boundaries = [
  { dir: 'packages/contracts', allow: [], pure: true },
  { dir: 'packages/learning-core', allow: ['contracts'], pure: true },
  { dir: 'packages/i18n', allow: [] },
  { dir: 'packages/ui-kit', allow: ['contracts', 'i18n'] },
  { dir: 'packages/game-sdk', allow: ['contracts', 'learning-core'] },
  { dir: 'packages/games/*', allow: ['contracts', 'game-sdk'] },
  { dir: 'packages/game-registry', allow: ['contracts', 'game-sdk', 'game-*'] },
  { dir: 'packages/mock-api', allow: ['contracts', 'learning-core'] },
  { dir: 'apps/*', allow: appAllow },
  {
    dir: 'apps/web/src/child',
    allow: appAllow,
    extra: [{ group: ['**/parent', '**/parent/**'], message: areaMessage('child', 'parent') }],
  },
  {
    dir: 'apps/web/src/parent',
    allow: appAllow,
    extra: [{ group: ['**/child', '**/child/**'], message: areaMessage('parent', 'child') }],
  },
  // The App Router's pages for each area (ADR 0042) keep to their own area too.
  {
    dir: 'apps/web/src/app/(child)',
    allow: appAllow,
    extra: [{ group: ['**/parent', '**/parent/**'], message: areaMessage('child', 'parent') }],
  },
  {
    dir: 'apps/web/src/app/parent',
    allow: appAllow,
    extra: [{ group: ['**/child', '**/child/**'], message: areaMessage('parent', 'child') }],
  },
  // Shared code, and the root layout every page loads, belong to neither area.
  {
    dir: 'apps/web/src/shared',
    allow: appAllow,
    extra: [
      { group: ['**/parent', '**/parent/**'], message: areaMessage('shared', 'parent') },
      { group: ['**/child', '**/child/**'], message: areaMessage('shared', 'child') },
    ],
  },
  { dir: 'tools/*', allow: appAllow },
];

const boundaryConfigs = boundaries.map(({ dir, allow, pure = false, extra = [] }) => {
  const allowed = allow.length > 0 ? allow.map((name) => `@learnofun/${name}`).join(', ') : 'none';
  const patterns = [
    {
      group: ['@learnofun/*', ...allow.map((name) => `!@learnofun/${name}`)],
      message: `${dir} may import only these Learnofun packages: ${allowed}. See the boundary table in eslint.config.js.`,
    },
  ];
  // Node built-ins are matched by exact name: as patterns, "events" would also match "./events".
  const paths = [];
  if (pure) {
    const message = `${dir} is pure: no React and no Node built-ins (CLAUDE.md rule 2).`;
    patterns.push({ group: ['react', 'react/*', 'react-dom', 'react-dom/*', 'node:*'], message });
    paths.push(...builtinModules.map((name) => ({ name, message })));
  }
  patterns.push(...extra);
  return {
    name: `boundaries/${dir}`,
    files: [`${dir}/**/*.{ts,tsx}`],
    rules: { 'no-restricted-imports': ['error', { paths, patterns }] },
  };
});

// I/O, timers, clocks and randomness that pure code must receive as inputs instead.
const impureGlobals = [
  'window',
  'document',
  'navigator',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'setTimeout',
  'setInterval',
  'requestAnimationFrame',
  'performance',
  'process',
  'crypto',
];

const purityConfig = {
  name: 'purity',
  files: ['packages/contracts/src/**/*.ts', 'packages/learning-core/src/**/*.ts'],
  ignores: ['**/*.test.ts'],
  rules: {
    'no-restricted-globals': [
      'error',
      ...impureGlobals.map((name) => ({
        name,
        message: `${name} is not allowed in pure code (CLAUDE.md rule 2). Pass it in as an input.`,
      })),
    ],
    'no-restricted-properties': [
      'error',
      { object: 'Date', property: 'now', message: 'Inject a clock instead (CLAUDE.md rule 2).' },
      {
        object: 'Math',
        property: 'random',
        message: 'Use the injected seeded RNG (CLAUDE.md rule 2).',
      },
    ],
    'no-restricted-syntax': [
      'error',
      {
        selector: "NewExpression[callee.name='Date'][arguments.length=0]",
        message: 'new Date() reads the clock. Inject a clock instead (CLAUDE.md rule 2).',
      },
    ],
  },
};

// User-facing text comes from the i18n catalogs (CLAUDE.md rule 5), and inline styles use logical
// properties, like the CSS (plan 7.2).
const textMessage = 'User-facing text must come from the i18n catalog: use t() (CLAUDE.md rule 5).';
const textAttributes =
  'alt|title|placeholder|label|aria-label|aria-description|aria-placeholder|aria-roledescription|aria-valuetext';
const styleMessage =
  'Use logical properties in inline styles, such as marginInlineStart or insetBlockStart (plan 7.2).';

const uiTextConfig = {
  name: 'ui-text-and-styles',
  files: ['**/*.tsx'],
  ignores: ['**/*.test.tsx'],
  rules: {
    'no-restricted-syntax': [
      'error',
      { selector: 'JSXText[value=/\\S/]', message: textMessage },
      {
        selector:
          ':matches(JSXElement, JSXFragment) > JSXExpressionContainer > :matches(Literal[value=/\\S/], TemplateLiteral)',
        message: textMessage,
      },
      {
        selector:
          ':matches(JSXElement, JSXFragment) > JSXExpressionContainer > :matches(ConditionalExpression, LogicalExpression) > Literal[value=/\\S/]',
        message: textMessage,
      },
      {
        selector: `JSXAttribute[name.name=/^(${textAttributes})$/] > Literal`,
        message: textMessage,
      },
      {
        selector: `JSXAttribute[name.name=/^(${textAttributes})$/] > JSXExpressionContainer > :matches(Literal, TemplateLiteral)`,
        message: textMessage,
      },
      {
        selector:
          "JSXAttribute[name.name='style'] Property[key.name=/^((margin|padding|border)(Top|Right|Bottom|Left)|top|right|bottom|left)/]",
        message: styleMessage,
      },
      {
        selector:
          "JSXAttribute[name.name='style'] Property[key.name=/^(textAlign|float|clear)$/] > Literal[value=/^(left|right)$/]",
        message: styleMessage,
      },
    ],
  },
};

export default defineConfig([
  globalIgnores([
    '**/dist/',
    '**/dist-e2e/',
    // Next.js's build and its static exports (ADR 0042).
    '**/.next/',
    '**/out/',
    '**/out-e2e/',
    '**/next-env.d.ts',
    '**/coverage/',
    '**/playwright-report/',
    '**/test-results/',
    '**/.turbo/',
    // Generated by MSW (npx msw init); updated by npm install.
    '**/mockServiceWorker.js',
  ]),
  {
    name: 'javascript',
    files: ['**/*.{js,mjs,ts,tsx}'],
    extends: [js.configs.recommended],
  },
  {
    name: 'node-scripts',
    files: ['**/scripts/**/*.mjs'],
    languageOptions: {
      globals: { process: 'readonly', console: 'readonly', setTimeout: 'readonly' },
    },
  },
  {
    name: 'typescript',
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    name: 'react-hooks',
    files: ['**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat['recommended-latest']],
  },
  {
    // npm hoists dependencies, so every package must declare what it imports (ADR 0002).
    name: 'declared-dependencies',
    files: ['**/*.{ts,tsx}'],
    plugins: { 'import-x': importX },
    settings: {
      'import-x/resolver-next': [
        createNodeResolver({ extensions: ['.ts', '.tsx', '.js', '.json'] }),
      ],
    },
    rules: {
      'import-x/no-extraneous-dependencies': [
        'error',
        {
          includeInternal: true,
          includeTypes: true,
          devDependencies: [
            '**/*.test.{ts,tsx}',
            '**/*.sim.ts',
            '**/e2e/**',
            '**/*.config.ts',
            '**/conformance/**',
          ],
        },
      ],
      'import-x/no-relative-packages': 'error',
    },
  },
  ...boundaryConfigs,
  purityConfig,
  uiTextConfig,
]);
