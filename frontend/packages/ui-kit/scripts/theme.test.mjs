import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { compile } from 'tailwindcss';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  renderThemeCss,
  renderThemeNamesTs,
  ROLES,
  THEME_CSS,
  THEME_NAMES_TS,
  TOKENS_JSON,
} from './tokens.mjs';

const tokens = JSON.parse(readFileSync(TOKENS_JSON, 'utf8'));
const theme = readFileSync(THEME_CSS, 'utf8');
const styles = join(dirname(THEME_CSS));
const worlds = readFileSync(join(styles, 'worlds.css'), 'utf8');

/** Tailwind's utilities on ui-kit's theme and nothing else, as an app's CSS entry has them. */
let build;
beforeAll(async () => {
  const compiler = await compile(
    "@import 'tailwindcss/utilities.css' layer(utilities);\n@import './tailwind.css';",
    {
      base: styles,
      loadStylesheet: async (id, base) => {
        const path = id.startsWith('tailwindcss/')
          ? join(styles, '..', '..', '..', '..', 'node_modules', id)
          : join(base, id);
        return { path, base: dirname(path), content: readFileSync(path, 'utf8') };
      },
    },
  );
  build = (classes) => compiler.build(classes);
});

describe('the Tailwind theme (ADR 0043)', () => {
  it('is exactly what tokens.json gives: after changing it, run npm run tokens -w @learnofun/ui-kit', () => {
    expect(theme).toBe(renderThemeCss(tokens));
  });

  it('gives tailwind-merge the same names: after changing tokens.json, run npm run tokens', () => {
    expect(readFileSync(THEME_NAMES_TS, 'utf8')).toBe(renderThemeNamesTs(tokens));
  });

  it('names only roles that worlds.css declares', () => {
    const roles = [
      ...ROLES.colours.map((role) => `--ui-${role}`),
      ...ROLES.type.flatMap((role) => [
        `--ui-${role}-font-family`,
        `--ui-${role}-font-size`,
        `--ui-${role}-line-height`,
        `--ui-${role}-font-weight`,
      ]),
      ...Object.values(ROLES.sizes).map((role) => `--${role}`),
      ...Object.values(ROLES.widths).map((role) => `--${role}`),
      ...Object.values(ROLES.weights).map((role) => `--${role}`),
    ];
    for (const role of roles) expect(worlds, role).toContain(`${role}:`);
  });

  it('turns token utilities into the tokens’ own variables', () => {
    const css = build([
      'bg-sun',
      'text-on-bright',
      'p-5',
      'gap-3',
      'rounded-lg',
      'shadow-press-depth',
      'font-display',
      'min-h-target-play',
      'size-tile-min',
      'max-w-measure',
      'bg-ui-primary',
    ]);
    expect(css).toContain('background-color: var(--sun)');
    expect(css).toContain('color: var(--on-bright)');
    expect(css).toContain('padding: var(--space-5)');
    expect(css).toContain('gap: var(--space-3)');
    expect(css).toContain('border-radius: var(--radius-lg)');
    expect(css).toContain('var(--press-depth)');
    expect(css).toContain('font-family: var(--font-display)');
    expect(css).toContain('min-height: var(--target-play)');
    expect(css).toContain('width: var(--tile-min)');
    expect(css).toContain('max-width: var(--measure)');
    expect(css).toContain('background-color: var(--ui-primary)');
  });

  it('gives each type style its size, line height and weight', () => {
    const css = build(['text-play-hero', 'text-site-headline']);
    expect(css).toContain('font-size: var(--play-hero-font-size)');
    expect(css).toContain('line-height: var(--tw-leading, var(--play-hero-line-height))');
    expect(css).toContain('font-weight: var(--tw-font-weight, var(--play-hero-font-weight))');
    expect(css).toContain(
      'letter-spacing: var(--tw-tracking, var(--site-headline-letter-spacing))',
    );
  });

  it('gives a type style’s size alone where the rest is inherited (ui-kit tailwind.css)', () => {
    // The whole rule: a size, and no line height or weight.
    expect(build(['text-size-ui-title'])).toMatch(
      /\.text-size-ui-title \{\s*font-size: var\(--ui-title-font-size\);\s*\}/,
    );
  });

  it('has no value of its own: Tailwind’s defaults do not exist', () => {
    for (const unknown of [
      'bg-red-500',
      'p-9',
      'rounded-xl',
      'shadow-md',
      'text-2xl',
      'font-serif',
    ]) {
      expect(build([unknown]), unknown).not.toContain(`.${unknown}`);
    }
  });

  it('declares no variables, so the tokens keep their names', () => {
    expect(build(['rounded-sm', 'shadow-sm', 'font-sans'])).not.toMatch(
      /--(radius|shadow|font)-[a-z]+:/,
    );
  });

  it('styles play pieces, the youngest band and keyboard focus on a ledge (ui-kit tailwind.css)', () => {
    expect(build(['play:shadow-press-depth'])).toMatch(/:where\(\[data-band\], \[data-band\] \*\)/);
    expect(build(['early-years:hidden'])).toContain("[data-band='early-years']");
    expect(build(['focus-visible:shadow-with-focus-press-depth'])).toContain(
      'box-shadow: var(--press-depth), var(--focus-ring)',
    );
    expect(build(['max-inline-ui-feedback'])).toContain(
      'max-inline-size: var(--ui-feedback-width)',
    );
    expect(build(['font-second-line'])).toContain('font-weight: var(--ui-second-line-weight)');
    expect(build(['active:translate-y-ui-press'])).toContain('var(--ui-press-offset)');
  });

  it('keeps the answer-tile classes DOM games use (ADR 0020)', () => {
    const css = build([]);
    expect(css).toContain('.lf-answer__tile');
    // The state marks are CheckIcon and RetryIcon, inlined (ADR 0045).
    expect(css).toContain('mask-image: url("data:image/svg+xml,%3Csvg');
    expect(css).toContain('M5 12.5l4.5 4.5L19 7.5');
  });

  it('gives each type style its line height alone, for text-size-* (FRONTEND-KICKOFF 1e)', () => {
    expect(build(['leading-read-story'])).toContain('line-height: var(--read-story-line-height)');
    expect(build(['leading-ui-label'])).toContain('line-height: var(--ui-label-line-height)');
  });

  it('lets a type utility win over font-inherit beside it', () => {
    const css = build(['text-size-family-body', 'font-label', 'font-inherit']);
    expect(css.indexOf('.font-inherit')).toBeLessThan(css.indexOf('.text-size-family-body'));
    expect(css.indexOf('.font-inherit')).toBeLessThan(css.indexOf('.font-label'));
  });

  it('names the games’ scene sizes and shapes as roles (worlds.css)', () => {
    expect(build(['max-inline-ui-scene'])).toContain('max-inline-size: var(--ui-scene-width)');
    expect(build(['max-block-ui-tray-height'])).toContain('max-block-size: var(--ui-tray-height)');
    expect(build(['rounded-ui-footprint'])).toContain('border-radius: var(--ui-footprint-radius)');
    expect(build(['font-number'])).toContain('font-weight: var(--ui-number-weight)');
  });

  it('styles phones below 30rem and keeps motion on the worlds’ durations', () => {
    expect(build(['wide:p-2'])).toContain('@media (width >= 40rem)');
    expect(build(['max-phone:p-2'])).toContain('@media (width < 30rem)');
    expect(build(['transition'])).toContain('var(--ui-duration-short)');
    expect(build(['duration-ui-medium'])).toContain(
      'transition-duration: var(--ui-duration-medium)',
    );
    // A transition utility after it keeps the duration: Tailwind reads --tw-duration.
    expect(build(['duration-ui-medium'])).toContain('--tw-duration: var(--ui-duration-medium)');
  });
});
