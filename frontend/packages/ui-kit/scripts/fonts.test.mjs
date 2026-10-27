import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HOSTED_FONTS, NEXT_APP_FONTS, readSubsets, renderNextFonts } from './fonts.mjs';
import { withSizedFallback } from './tokens.mjs';

describe('the apps’ fonts (ADR 0042)', () => {
  it('are what the fontsource packages give, in every Next.js app: after changing them, run npm run fonts -w @learnofun/ui-kit', () => {
    const source = renderNextFonts();
    for (const file of NEXT_APP_FONTS) expect(readFileSync(file, 'utf8'), file).toBe(source);
  });

  it('load every weight of every subset, the Latin subset last', () => {
    for (const font of HOSTED_FONTS) {
      const subsets = readSubsets(font);
      expect(subsets.at(-1)?.subset, font.family).toBe('latin');
      for (const { subset, files } of subsets) {
        expect(
          files.map(({ weight }) => weight),
          `${font.family} ${subset}`,
        ).toEqual(font.weights);
      }
    }
  });

  it('declare each family under its own name, as the design tokens name it', () => {
    const source = renderNextFonts();
    for (const font of HOSTED_FONTS) {
      expect(source).toContain(`{ prop: 'font-family', value: "'${font.family}'" }`);
    }
  });

  it('keep the names in the tokens’ font stacks, with the sized fallback before the generic families', () => {
    expect(withSizedFallback('"Baloo 2", "Baloo Bhaijaan 2", system-ui, sans-serif')).toBe(
      '"Baloo 2", "Baloo Bhaijaan 2", var(--font-fallback-baloo-2, system-ui), system-ui, sans-serif',
    );
    expect(withSizedFallback('Andika, "Readex Pro", system-ui, sans-serif')).toBe(
      'Andika, "Readex Pro", var(--font-fallback-andika, system-ui), system-ui, sans-serif',
    );
  });
});
