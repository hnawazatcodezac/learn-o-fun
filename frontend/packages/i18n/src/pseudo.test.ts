import { describe, expect, it } from 'vitest';
import { pseudoLocalize } from './pseudo';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

describe('pseudoLocalize', () => {
  it('accents every ASCII letter in en-XA', () => {
    expect(pseudoLocalize(ALPHABET, 'en-XA')).not.toMatch(/[A-Za-z]/);
  });

  it('keeps English words in en-XB', () => {
    expect(pseudoLocalize('Learnofun', 'en-XB')).toMatch(/^\[Learnofun ·+\]$/);
  });

  it.each(['en-XA', 'en-XB'] as const)('makes %s text at least 40% longer', (locale) => {
    const text = 'Progress and recommendations will appear here.';
    expect(pseudoLocalize(text, locale).length).toBeGreaterThanOrEqual(text.length * 1.4);
  });

  it('pads even very short text', () => {
    expect(pseudoLocalize('Go', 'en-XA')).toBe('[Ĝö ··]');
  });

  it('leaves digits and punctuation alone', () => {
    expect(pseudoLocalize('11 games, 3 days!', 'en-XA')).toMatch(/^\[11 ĝåɱéš, 3 ðåýš! ·+\]$/);
  });
});
