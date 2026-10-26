import { describe, expect, it } from 'vitest';
import { formattingLocale, getDirection, pickLocale } from './locales';

describe('getDirection', () => {
  it.each([
    ['en', 'ltr'],
    ['en-GB', 'ltr'],
    ['en-XA', 'ltr'],
    ['en-XB', 'rtl'],
    ['ar', 'rtl'],
    ['ar-AE', 'rtl'],
    ['he', 'rtl'],
  ])('%s reads %s', (locale, direction) => {
    expect(getDirection(locale)).toBe(direction);
  });
});

describe('formattingLocale', () => {
  it('formats pseudo-locales as English', () => {
    expect(formattingLocale('en-XA')).toBe('en');
    expect(formattingLocale('en-XB')).toBe('en');
  });

  it('keeps real locales', () => {
    expect(formattingLocale('en-GB')).toBe('en-GB');
  });
});

describe('pickLocale', () => {
  it('falls back to English when nothing is requested', () => {
    expect(pickLocale(null, { allowPseudo: true })).toBe('en');
    expect(pickLocale(undefined, { allowPseudo: true })).toBe('en');
  });

  it('accepts a supported locale', () => {
    expect(pickLocale('en', { allowPseudo: false })).toBe('en');
  });

  it('accepts pseudo-locales only when allowed', () => {
    expect(pickLocale('en-XB', { allowPseudo: true })).toBe('en-XB');
    expect(pickLocale('en-XB', { allowPseudo: false })).toBe('en');
  });

  it('falls back to English for an unsupported locale', () => {
    expect(pickLocale('fr', { allowPseudo: true })).toBe('en');
  });
});
