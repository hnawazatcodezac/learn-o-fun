import { describe, expect, it } from 'vitest';
import { createFormatters } from './format';
import { pseudoLocalize } from './pseudo';

describe('createFormatters', () => {
  const en = createFormatters({ locale: 'en' });

  it('formats numbers', () => {
    expect(en.number(1234.5)).toBe('1,234.5');
  });

  it('formats numbers with Arabic-Indic digits and separator when the market asks for them', () => {
    expect(createFormatters({ locale: 'en', numberingSystem: 'arab' }).number(1234)).toBe('١٬٢٣٤');
  });

  it('formats units', () => {
    expect(en.unit(5, 'kilometer')).toBe('5 km');
    expect(en.unit(5, 'kilometer', { unitDisplay: 'long' })).toBe('5 kilometers');
  });

  it('formats dates', () => {
    const date = new Date(Date.UTC(2026, 9, 20));

    expect(en.date(date, { dateStyle: 'long', timeZone: 'UTC' })).toBe('October 20, 2026');
  });

  it('formats relative time', () => {
    expect(en.relativeTime(-1, 'day')).toBe('1 day ago');
    expect(en.relativeTime(-1, 'day', { numeric: 'auto' })).toBe('yesterday');
  });

  it('formats lists', () => {
    expect(en.list(['counting', 'adding', 'shapes'])).toBe('counting, adding, and shapes');
  });

  it('selects plural categories', () => {
    expect(en.pluralCategory(1)).toBe('one');
    expect(en.pluralCategory(2)).toBe('other');
  });

  it('formats pseudo-locales as English', () => {
    expect(createFormatters({ locale: 'en-XB' }).number(1234.5)).toBe('1,234.5');
  });

  it('names months and languages', () => {
    expect(en.monthName(1)).toBe('January');
    expect(en.monthName(12, 'short')).toBe('Dec');
    expect(en.languageName('en')).toBe('English');
  });

  it('pseudo-localizes names, which are text, as it does content', () => {
    const accented = createFormatters({ locale: 'en-XA' });

    expect(accented.monthName(10)).toBe(pseudoLocalize('October', 'en-XA'));
    expect(accented.languageName('en')).toBe(pseudoLocalize('English', 'en-XA'));
    expect(accented.monthName(10)).not.toMatch(/[A-Za-z]/);
  });

  it('pseudo-localizes dates and relative times too, which carry words', () => {
    const accented = createFormatters({ locale: 'en-XA' });
    const date = new Date(Date.UTC(2026, 9, 20));

    expect(accented.date(date, { dateStyle: 'long', timeZone: 'UTC' })).toBe(
      pseudoLocalize('October 20, 2026', 'en-XA'),
    );
    expect(accented.relativeTime(-1, 'day')).toBe(pseudoLocalize('1 day ago', 'en-XA'));
    // Numbers stay as they are, for games.
    expect(accented.number(1234)).toBe('1,234');
  });
});
