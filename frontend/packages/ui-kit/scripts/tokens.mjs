// Generates the UI kit's design tokens from the design system (ADR 0019, ADR 0043):
// docs/design-system/tokens.json → packages/ui-kit/src/styles/tokens.css, the CSS variables, and
// packages/ui-kit/src/styles/theme.css, the Tailwind theme that points at them.
//
// Usage: npm run tokens -w @learnofun/ui-kit
// A unit test renders both again and fails if either file and tokens.json differ.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOSTED_FONTS, fallbackVariable } from './fonts.mjs';

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
export const THEME_CSS = join(here, '..', 'src', 'styles', 'theme.css');
export const THEME_NAMES_TS = join(here, '..', 'src', 'theme-names.ts');

/**
 * The worlds' roles in src/styles/worlds.css (ADR 0019), which the components style with so one
 * Button serves Play and Family. Each is an alias of a token, or the team's value for a gap the
 * design system leaves; the theme names them `ui-*` beside the tokens.
 */
export const ROLES = {
  colours: [
    'ground',
    'primary',
    'on-primary',
    'primary-text',
    'secondary',
    'on-secondary',
    'secondary-border',
    'selected',
    'on-selected',
    'selected-border',
    'disabled',
    'on-disabled',
    'disabled-border',
    'backdrop',
  ],
  type: ['body', 'label', 'heading', 'title', 'small'],
  /** Utility name → the role's variable, on the spacing scale (inline-, block-, p-, gap-, basis-). */
  sizes: {
    target: 'ui-target',
    gap: 'ui-gap',
    card: 'ui-card-padding',
    icon: 'ui-icon-size',
    press: 'ui-press-offset',
    'chip-y': 'ui-chip-padding-block',
    'chip-x': 'ui-chip-padding-inline',
    'card-art': 'ui-card-art-height',
    'trail-dot': 'ui-trail-dot',
    'feedback-badge': 'ui-feedback-badge',
    'status-height': 'ui-status-height',
    'status-gap': 'ui-status-gap',
    dialog: 'ui-dialog-width',
    'dialog-height': 'ui-dialog-max-height',
    'burst-top': 'ui-burst-top',
    'placeholder-shape': 'ui-placeholder-shape',
    'profile-choice': 'ui-profile-choice',
    'profile-avatar': 'ui-profile-avatar',
    'progress-basis': 'ui-progress-basis',
    'tray-basis': 'ui-tray-basis',
    'counter-basis': 'ui-counter-basis',
    'tray-height': 'ui-tray-height',
    'field-height': 'ui-field-height',
    'wide-field-height': 'ui-wide-field-height',
    'phone-field-height': 'ui-phone-field-height',
    'footprint-x': 'ui-footprint-width',
    'footprint-y': 'ui-footprint-height',
    'tool-menu': 'ui-tool-menu-width',
    'tool-control': 'ui-tool-control-height',
    'tool-check': 'ui-tool-check-size',
    'tool-stage': 'ui-tool-stage-height',
    'tool-log': 'ui-tool-log-height',
    'tool-number': 'ui-tool-number-width',
  },
  /** Utility name → the role's variable, for max-inline-. */
  widths: {
    feedback: 'ui-feedback-width',
    toast: 'ui-toast-width',
    settings: 'ui-settings-width',
    cards: 'ui-cards-width',
    'family-page': 'ui-family-page-width',
    scene: 'ui-scene-width',
    field: 'ui-field-width',
    'wide-scene': 'ui-wide-scene-width',
    preview: 'ui-preview-width',
  },
  /** Utility name → the role's variable, for rounded-. */
  radii: { footprint: 'ui-footprint-radius' },
  /** Utility name → the role's variable, for font weights. */
  weights: {
    'second-line': 'ui-second-line-weight',
    label: 'ui-label-font-weight',
    wordmark: 'ui-wordmark-weight',
    number: 'ui-number-weight',
  },
};

/**
 * Phones are narrower than 30rem, 480px (ADR 0019): `max-phone:` styles them. From 40rem, `wide:`,
 * a game's scene may sit beside its controls. From 60rem, `desktop:`, the game sandbox puts its
 * panels beside the game.
 */
export const BREAKPOINTS = { phone: '30rem', wide: '40rem', desktop: '60rem' };

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
    ([name, stack]) => `--font-${name}: ${withSizedFallback(stack)};`,
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

const GENERIC_FAMILIES = new Set([
  'system-ui',
  '-apple-system',
  'ui-sans-serif',
  'sans-serif',
  'serif',
  'monospace',
]);

/**
 * A token's font stack with the fallback font next/font sizes like its first self-hosted family
 * (ADR 0042), used while that family loads. It goes just before the generic families, so it never
 * takes the place of another family in the stack. The apps' next/font faces carry the families'
 * own names, so the names stand; without the variable, as in a unit test, the stack is unchanged.
 */
export function withSizedFallback(stack) {
  const families = stack.split(',').map((family) => family.trim());
  const first = families
    .map((family) => HOSTED_FONTS.find((font) => font.family === family.replace(/"/g, '')))
    .find(Boolean);
  const generic = families.findIndex((family) => GENERIC_FAMILIES.has(family));
  if (!first || generic < 0) return stack;
  const parts = [...families];
  parts.splice(generic, 0, `var(${fallbackVariable(first)}, ${families[generic] ?? ''})`);
  return parts.join(', ');
}

/** The Tailwind name of a token in a scale whose CSS names carry its prefix: radius-sm → sm. */
const short = (name, prefix) => (name.startsWith(prefix) ? name.slice(prefix.length) : name);

/**
 * Renders the Tailwind theme (ADR 0043): every utility points at a variable from tokens.css or
 * worlds.css, so the themes switch through data-theme and the worlds through data-band, without
 * dark: variants. Nothing else is in it: Tailwind's own theme is never imported, so its default
 * colours, spacing, radii, shadows and font sizes do not exist. `inline` puts each variable into
 * its utilities; `reference` declares nothing, so --radius-sm and its kin stay the tokens' own.
 */
export function renderThemeCss(tokens) {
  const colours = [
    ...tokens.color.tokens.map((token) => `--color-${token.name}: var(--${token.name});`),
    '/* The worlds’ roles (worlds.css) */',
    ...ROLES.colours.map((role) => `--color-ui-${role}: var(--ui-${role});`),
  ];
  const spacing = [
    '--spacing-0: 0px;',
    ...tokens.spacing.tokens.map(
      (token) => `--spacing-${short(token.name, 'space-')}: var(--${token.name});`,
    ),
    '/* Sizes on the spacing scale: min-h-target-play, size-tile-min */',
    ...tokens.size.tokens
      .filter((token) => token.name !== 'measure')
      .map((token) => `--spacing-${token.name}: var(--${token.name});`),
    ...Object.entries(ROLES.sizes).map(([name, role]) => `--spacing-ui-${name}: var(--${role});`),
    '--container-measure: var(--measure);',
    ...Object.entries(ROLES.widths).map(
      ([name, role]) => `--container-ui-${name}: var(--${role});`,
    ),
  ];
  const radii = [
    ...tokens.radius.tokens.map(
      (token) => `--radius-${short(token.name, 'radius-')}: var(--${token.name});`,
    ),
    '--radius-ui: var(--ui-radius);',
    ...Object.entries(ROLES.radii).map(([name, role]) => `--radius-ui-${name}: var(--${role});`),
  ];
  const shadows = tokens.shadow.tokens.map(
    (token) => `--shadow-${short(token.name, 'shadow-')}: var(--${token.name});`,
  );
  const fonts = [
    ...Object.keys(tokens.type.families).map((name) => `--font-${name}: var(--font-${name});`),
    ...ROLES.type.map((role) => `--font-ui-${role}: var(--ui-${role}-font-family);`),
    ...Object.entries(ROLES.weights).map(
      ([name, role]) => `--font-weight-${name}: var(--${role});`,
    ),
  ];
  const textStyle = (name, variable) => [
    `--text-${name}: var(--${variable}-font-size);`,
    `--text-${name}--line-height: var(--${variable}-line-height);`,
    `--text-${name}--font-weight: var(--${variable}-font-weight);`,
  ];
  const text = [
    ...tokens.type.groups.flatMap((group) =>
      group.styles.flatMap((style) => [
        ...textStyle(style.name, style.name),
        ...(style.letterSpacing === undefined
          ? []
          : [`--text-${style.name}--letter-spacing: var(--${style.name}-letter-spacing);`]),
      ]),
    ),
    ...ROLES.type.flatMap((role) => textStyle(`ui-${role}`, `ui-${role}`)),
  ];
  /* A type style's line height alone, beside text-size-*, where the weight is inherited. */
  const leading = [
    ...tokens.type.groups.flatMap((group) =>
      group.styles.map((style) => `--leading-${style.name}: var(--${style.name}-line-height);`),
    ),
    ...ROLES.type.map((role) => `--leading-ui-${role}: var(--ui-${role}-line-height);`),
  ];
  const breakpoints = Object.entries(BREAKPOINTS).map(
    ([name, value]) => `--breakpoint-${name}: ${value};`,
  );
  const motion = [
    '--default-transition-duration: var(--ui-duration-short);',
    '--default-transition-timing-function: var(--ui-easing);',
    '--ease-ui: var(--ui-easing);',
  ];

  return [
    `/*\n * Generated from docs/design-system/tokens.json (version ${String(tokens.version)}) by\n * \`npm run tokens -w @learnofun/ui-kit\`. Do not edit: change tokens.json and run the script.\n * A test fails when this file and tokens.json differ (ADR 0043).\n */\n`,
    block('@theme inline reference', [
      '/* Colours, which switch with data-theme */',
      ...colours,
      '/* Spacing: p-1 to p-8 are space-1 to space-8 */',
      ...spacing,
      '/* Radius: rounded-sm, -md, -lg and -full */',
      ...radii,
      '/* Shadows */',
      ...shadows,
      '/* Fonts */',
      ...fonts,
      '/* Type styles: text-play-hero and the rest, with their line height and weight */',
      ...text,
      '/* Line heights: leading-read-story and the rest, beside text-size-* */',
      ...leading,
      '/* Breakpoints (ADR 0019) */',
      ...breakpoints,
      '/* Motion: 150 to 250ms, easing out, and none under reduced motion (worlds.css) */',
      ...motion,
    ]),
  ].join('\n');
}

/**
 * The theme's names by kind, for tailwind-merge (ADR 0043): told them, it knows that
 * `text-play-hero` is a size and `text-ink` a colour, so `cn()` keeps both.
 */
export function themeNames(tokens) {
  return {
    color: [
      ...tokens.color.tokens.map((token) => token.name),
      ...ROLES.colours.map((role) => `ui-${role}`),
    ],
    spacing: [
      '0',
      ...tokens.spacing.tokens.map((token) => short(token.name, 'space-')),
      ...tokens.size.tokens.filter((token) => token.name !== 'measure').map((token) => token.name),
      ...Object.keys(ROLES.sizes).map((name) => `ui-${name}`),
    ],
    container: ['measure', ...Object.keys(ROLES.widths).map((name) => `ui-${name}`)],
    radius: [
      ...tokens.radius.tokens.map((token) => short(token.name, 'radius-')),
      'ui',
      ...Object.keys(ROLES.radii).map((name) => `ui-${name}`),
    ],
    shadow: tokens.shadow.tokens.map((token) => short(token.name, 'shadow-')),
    font: [...Object.keys(tokens.type.families), ...ROLES.type.map((role) => `ui-${role}`)],
    'font-weight': Object.keys(ROLES.weights),
    text: [
      ...tokens.type.groups.flatMap((group) => group.styles.map((style) => style.name)),
      ...ROLES.type.map((role) => `ui-${role}`),
    ],
    leading: [
      ...tokens.type.groups.flatMap((group) => group.styles.map((style) => style.name)),
      ...ROLES.type.map((role) => `ui-${role}`),
    ],
    breakpoint: Object.keys(BREAKPOINTS),
  };
}

/** Renders the names as a TypeScript module. */
export function renderThemeNamesTs(tokens) {
  const names = themeNames(tokens);
  const lines = Object.entries(names).map(
    ([kind, list]) =>
      `  ${/^\w+$/.test(kind) ? kind : `'${kind}'`}: [${list.map((name) => `'${name}'`).join(', ')}],`,
  );
  return [
    '/*',
    ` * Generated from docs/design-system/tokens.json (version ${String(tokens.version)}) by`,
    ' * `npm run tokens -w @learnofun/ui-kit`. Do not edit: change tokens.json and run the script.',
    ' * A test fails when this file and tokens.json differ (ADR 0043).',
    ' */',
    '',
    '/** The Tailwind theme’s names by kind, for tailwind-merge. */',
    'export const THEME_NAMES = {',
    ...lines,
    '} as const;',
    '',
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const tokens = JSON.parse(readFileSync(TOKENS_JSON, 'utf8'));
  writeFileSync(TOKENS_CSS, renderTokensCss(tokens));
  console.log(`Wrote ${TOKENS_CSS}`);
  writeFileSync(THEME_CSS, renderThemeCss(tokens));
  console.log(`Wrote ${THEME_CSS}`);
  writeFileSync(THEME_NAMES_TS, renderThemeNamesTs(tokens));
  console.log(`Wrote ${THEME_NAMES_TS}`);
}
