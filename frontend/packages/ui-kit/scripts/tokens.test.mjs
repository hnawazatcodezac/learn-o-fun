import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderTokensCss, TOKENS_CSS, TOKENS_JSON } from './tokens.mjs';

const tokens = JSON.parse(readFileSync(TOKENS_JSON, 'utf8'));
const css = readFileSync(TOKENS_CSS, 'utf8');

/** The custom properties declared directly in the block that starts with `selector {`. */
function declarations(selector) {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No block for ${selector}`);
  const body = css.slice(start + selector.length + 2, css.indexOf('}', start));
  return Object.fromEntries(
    [...body.matchAll(/(--[a-z0-9-]+): ([^;]+);/g)].map(([, name, value]) => [name, value]),
  );
}

const THEME_BLOCKS = {
  light: ":root,\n:root[data-theme='light']",
  dark: ":root[data-theme='dark']",
  contrast: ":root[data-theme='contrast']",
};

describe('the design tokens (ADR 0019)', () => {
  it('are exactly what tokens.json gives: after changing it, run npm run tokens -w @learnofun/ui-kit', () => {
    expect(css).toBe(renderTokensCss(tokens));
  });

  it('carry every colour and shadow of every theme, by its token name', () => {
    for (const [theme, selector] of Object.entries(THEME_BLOCKS)) {
      const declared = declarations(selector);
      for (const token of tokens.color.tokens) {
        const value = typeof token.value === 'string' ? token.value : token.value[theme];
        const expected = value.startsWith('{') ? `var(--${value.slice(1, -1)})` : value;
        expect(declared[`--${token.name}`], `${token.name} in ${theme}`).toBe(expected);
      }
      for (const token of tokens.shadow.tokens) {
        expect(declared[`--${token.name}`], `${token.name} in ${theme}`).toBe(token.value[theme]);
      }
    }
  });

  it('follow the device in dark mode and high contrast unless a theme is chosen', () => {
    expect(css).toMatch(
      /@media \(prefers-color-scheme: dark\) \{\n {2}:root:not\(\[data-theme\]\) \{\n {4}--play-ground: #141b36;/,
    );
    expect(css).toMatch(
      /@media \(prefers-contrast: more\) \{\n {2}:root:not\(\[data-theme\]\) \{\n {4}--play-ground: #ffffff;/,
    );
    // High contrast comes after dark, so it wins when the device asks for both.
    expect(css.indexOf('prefers-contrast')).toBeGreaterThan(css.indexOf('prefers-color-scheme'));
  });

  it('carry spacing, radius and sizes unchanged', () => {
    const root = declarations(':root');
    for (const scale of ['spacing', 'radius', 'size']) {
      for (const token of tokens[scale].tokens) {
        expect(root[`--${token.name}`], token.name).toBe(token.value);
      }
    }
  });

  it('carry every type style, with pixel sizes in rem at 16px to the rem', () => {
    const root = declarations(':root');
    for (const [name, stack] of Object.entries(tokens.type.families)) {
      expect(root[`--font-${name}`]).toBe(stack);
    }
    for (const group of tokens.type.groups) {
      for (const style of group.styles) {
        expect(root[`--${style.name}-font-family`]).toBe(`var(--font-${group.family})`);
        expect(root[`--${style.name}-font-size`]).toBe(
          `${String(parseFloat(style.fontSize) / 16)}rem`,
        );
        expect(root[`--${style.name}-line-height`]).toBe(
          `${String(parseFloat(style.lineHeight) / 16)}rem`,
        );
        expect(root[`--${style.name}-font-weight`]).toBe(String(style.fontWeight));
      }
    }
    expect(root['--play-label-font-size']).toBe('1.375rem');
    expect(root['--site-headline-letter-spacing']).toBe('-0.01em');
  });
});
