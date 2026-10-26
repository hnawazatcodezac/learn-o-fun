// Generates the UI kit's design tokens from the design system (ADR 0019):
// docs/design-system/tokens.json → packages/ui-kit/src/styles/tokens.css.
//
// Usage: npm run tokens -w @learnofun/ui-kit
// A unit test renders the CSS again and fails if the file and tokens.json differ.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const TOKENS_JSON = join(
  here,
  '..',
  '..',
  '..',
  '..',
  'docs',
  'design-system',
  'tokens.json',
);
export const TOKENS_CSS = join(here, '..', 'src', 'styles', 'tokens.css');

/** The root font size the rem values assume: 16px, the browser default. */
const ROOT_PX = 16;

const kebab = (name) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/** A pixel length in rem, so the text-size setting scales it. Other values pass through. */
function rem(value) {
  const match = /^(-?\d+(?:\.\d+)?)px$/.exec(String(value));
  if (!match) return String(value);
  return `${String(Number(match[1]) / ROOT_PX)}rem`;
}

/** A token's value: `{name}` refers to another token. */
function cssValue(value) {
  const alias = /^\{([a-z0-9-]+)\}$/.exec(String(value));
  return alias ? `var(--${alias[1]})` : String(value);
}

const block = (selector, lines) =>
  `${selector} {\n${lines.map((line) => `  ${line}`).join('\n')}\n}\n`;

/** The colour and shadow declarations for one theme. */
function themed(tokens, theme) {
  const colours = tokens.color.tokens.map((token) => {
    const value = typeof token.value === 'string' ? token.value : token.value[theme];
    return `--${token.name}: ${cssValue(value)};`;
  });
  const shadows = tokens.shadow.tokens.map((token) => `--${token.name}: ${token.value[theme]};`);
  return [...colours, ...shadows];
}

/** Renders tokens.json as CSS custom properties, named exactly as the tokens are. */
export function renderTokensCss(tokens) {
  const themes = tokens.color.themes.map((theme) => theme.id);
  const [base, ...others] = themes;
  if (base !== 'light' || !others.includes('dark') || !others.includes('contrast')) {
    throw new Error(`Expected the themes light, dark and contrast, not ${themes.join(', ')}`);
  }

  const families = Object.entries(tokens.type.families).map(
    ([name, stack]) => `--font-${name}: ${stack};`,
  );
  const styles = tokens.type.groups.flatMap((group) =>
    group.styles.flatMap((style) => [
      `--${style.name}-font-family: var(--font-${group.family});`,
      ...Object.entries(style)
        .filter(([field]) => !['name', 'sample', 'usage'].includes(field))
        .map(([field, value]) => `--${style.name}-${kebab(field)}: ${rem(value)};`),
    ]),
  );
  const scales = ['spacing', 'radius', 'size'].flatMap((scale) =>
    tokens[scale].tokens.map((token) => `--${token.name}: ${token.value};`),
  );

  return [
    `/*\n * Generated from docs/design-system/tokens.json (version ${String(tokens.version)}) by\n * \`npm run tokens -w @learnofun/ui-kit\`. Do not edit: change tokens.json and run the script.\n * A test fails when this file and tokens.json differ (ADR 0019).\n */\n`,
    block(':root', [
      '/* Type families */',
      ...families,
      '/* Type styles, in rem (px ÷ 16), so the text-size setting scales them */',
      ...styles,
      '/* Spacing, radius and size */',
      ...scales,
    ]),
    '/* Colours and shadows. Light is the default. */\n',
    block(":root,\n:root[data-theme='light']", themed(tokens, 'light')),
    "/* Without a chosen theme, the device's preferences choose. */\n",
    `@media (prefers-color-scheme: dark) {\n${block(':root:not([data-theme])', themed(tokens, 'dark')).replace(/^/gm, '  ')}}\n`,
    `@media (prefers-contrast: more) {\n${block(':root:not([data-theme])', themed(tokens, 'contrast')).replace(/^/gm, '  ')}}\n`,
    block(":root[data-theme='dark']", themed(tokens, 'dark')),
    block(":root[data-theme='contrast']", themed(tokens, 'contrast')),
  ]
    .join('\n')
    .replace(/^ +$/gm, '');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const tokens = JSON.parse(readFileSync(TOKENS_JSON, 'utf8'));
  writeFileSync(TOKENS_CSS, renderTokensCss(tokens));
  console.log(`Wrote ${TOKENS_CSS}`);
}
