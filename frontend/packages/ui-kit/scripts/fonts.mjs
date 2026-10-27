// Generates each Next.js app's fonts from the fontsource packages (ADR 0019, ADR 0042): the
// design system's three families, self-hosted, through next/font/local, into src/app/fonts.ts of
// every app. next/font needs its options written out, so the module is generated, not shared.
//
// Usage: npm run fonts -w @learnofun/ui-kit
// A unit test renders the module again and fails if any app's copy differs.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const frontend = join(here, '..', '..', '..');

/** The families and weights the design system uses (its README), each a fontsource package. */
export const HOSTED_FONTS = [
  { family: 'Baloo 2', package: 'baloo-2', weights: [500, 700, 800] },
  { family: 'Andika', package: 'andika', weights: [400, 700] },
  { family: 'Readex Pro', package: 'readex-pro', weights: [400, 500, 600] },
];

/** The Next.js apps, each with its own copy of the module. */
export const NEXT_APP_FONTS = ['apps/web', 'tools/ui-preview', 'tools/game-sandbox'].map((app) =>
  join(frontend, app, 'src', 'app', 'fonts.ts'),
);

/** The variable with the fallback font next/font sizes like a family's Latin faces. */
export const fallbackVariable = (font) => `--font-fallback-${font.package}`;

/** The font files, from each app's src/app, in the workspace's node_modules. */
const FILES_FROM_APP = '../../../../node_modules/@fontsource';

const camel = (text) => text.replace(/-([a-z0-9])/g, (_, letter) => letter.toUpperCase());

/**
 * A family's faces by subset, from fontsource's stylesheet for each weight: each subset's
 * unicode range and its file for every weight. Latin comes last.
 */
export function readSubsets(font) {
  const folder = dirname(require.resolve(`@fontsource/${font.package}/package.json`));
  const subsets = new Map();
  for (const weight of font.weights) {
    const css = readFileSync(join(folder, `${String(weight)}.css`), 'utf8');
    for (const [, name, body] of css.matchAll(/\/\* (\S+) \*\/\s*@font-face \{([^}]*)\}/g)) {
      const subset = name.slice(font.package.length + 1, -`-${String(weight)}-normal`.length);
      const range = /unicode-range: ([^;]+);/.exec(body)?.[1];
      if (!range) throw new Error(`No unicode-range for ${name}`);
      const entry = subsets.get(subset) ?? { subset, range, files: [] };
      if (entry.range !== range) throw new Error(`${name} has another range than its subset`);
      entry.files.push({ file: `${name}.woff2`, weight });
      subsets.set(subset, entry);
    }
  }
  if (!subsets.has('latin')) throw new Error(`${font.family} has no Latin subset`);
  return [...subsets.values()].sort(
    (a, b) => Number(a.subset === 'latin') - Number(b.subset === 'latin'),
  );
}

const constName = (font, subset) => camel(`${font.package}-${subset}`);

function renderCall(font, { subset, range, files }) {
  const latin = subset === 'latin';
  const src = files
    .map(
      ({ file, weight }) =>
        `    { path: '${FILES_FROM_APP}/${font.package}/files/${file}', weight: '${String(weight)}', style: 'normal' },`,
    )
    .join('\n');
  return [
    `export const ${constName(font, subset)} = localFont({`,
    '  src: [',
    src,
    '  ],',
    "  display: 'swap',",
    `  preload: ${String(latin)},`,
    `  adjustFontFallback: ${latin ? "'Arial'" : 'false'},`,
    '  declarations: [',
    `    { prop: 'font-family', value: "'${font.family}'" },`,
    `    { prop: 'unicode-range', value: '${range}' },`,
    '  ],',
    '});',
  ].join('\n');
}

/** The module every Next.js app gets. */
export function renderNextFonts() {
  const fonts = HOSTED_FONTS.map((font) => ({ font, subsets: readSubsets(font) }));
  const calls = fonts.flatMap(({ font, subsets }) =>
    subsets.map((subset) => renderCall(font, subset)),
  );
  const variables = HOSTED_FONTS.map(
    (font) => `  '${fallbackVariable(font)}': fallbackOf(${constName(font, 'latin')}),`,
  );
  return [
    '/*',
    ' * Generated from the fontsource packages by `npm run fonts -w @learnofun/ui-kit`. Do not edit:',
    ' * change packages/ui-kit/scripts/fonts.mjs and run it. A test fails when this file and the',
    ' * fonts differ (ADR 0042).',
    ' */',
    "import localFont from 'next/font/local';",
    '',
    '/*',
    " * The design system's three families, self-hosted with next/font (ADR 0019, ADR 0042), under",
    ' * their own names, as the design tokens name them: a group of faces per subset, so a browser',
    ' * downloads only the subsets a page shows. Only the Latin faces are preloaded, and they get a',
    ' * fallback font sized to match.',
    ' */',
    ...calls.flatMap((call) => ['', call]),
    '',
    "/** The fallback font next/font sizes like a family's Latin faces: its second family. */",
    'function fallbackOf(latin: ReturnType<typeof localFont>): string {',
    "  return latin.style.fontFamily.split(', ')[1] ?? '';",
    '}',
    '',
    '/**',
    " * Each family's sized fallback, which the design tokens' font stacks use while the family",
    ' * loads (tokens.css): set these on <html>.',
    ' */',
    'export const FONT_FALLBACKS: Record<string, string> = {',
    ...variables,
    '};',
    '',
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const source = renderNextFonts();
  for (const file of NEXT_APP_FONTS) {
    writeFileSync(file, source);
    console.log(`Wrote ${file}`);
  }
}
