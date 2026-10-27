import { describe, expect, it, vi } from 'vitest';
import { createI18n } from './create-i18n';
import type { AppLocale } from './locales';

describe('createI18n', () => {
  it('translates a key from the English catalog', () => {
    expect(createI18n('en').t('child.title')).toBe('Learnofun');
  });

  it('formats ICU plurals', () => {
    const { t } = createI18n('en');

    expect(t('child.placeholder.body', { count: 1 })).toBe('1 game is on the way.');
    expect(t('child.placeholder.body', { count: 11 })).toBe('11 games are on the way.');
  });

  it('says one hop in the singular in Hop Line', () => {
    const { t } = createI18n('en');

    expect(t('games.hopLine.instructions', { start: 3, hops: 1 })).toBe(
      'Start on 3. Hop 1 time. Where does the frog land?',
    );
    expect(t('games.hopLine.hint', { hops: 1 })).toBe('Make 1 hop. Each footprint is one hop.');
    expect(t('games.hopLine.footprints', { done: 0, total: 1 })).toBe('0 of 1 hop made');
    expect(t('games.hopLine.explanations.goes-to-the-number', { start: 3, hops: 1 })).toBe(
      'Hop 1 time from 3. Don’t hop to 1.',
    );
    expect(t('games.hopLine.instructions', { start: 3, hops: 6 })).toBe(
      'Start on 3. Hop 6 times. Where does the frog land?',
    );
  });

  it('formats numbers inside messages with Intl', () => {
    expect(createI18n('en').t('child.placeholder.body', { count: 1200 })).toBe(
      '1,200 games are on the way.',
    );
  });

  it('falls back from a regional locale to its language', () => {
    const i18n = createI18n('en');
    // A regional locale, as the app will have: its messages are its language's.
    i18n.changeLocale('en-AE' as AppLocale);

    expect(i18n.t('parent.title')).toBe('Learnofun for families');
    expect(i18n.settings.locale).toBe('en-AE');
  });

  it('reports a key missing from every locale and shows the key', () => {
    const onMissingKey = vi.fn();
    const i18n = createI18n('en', { onMissingKey });

    // @ts-expect-error -- deliberately not a catalog key
    expect(i18n.t('child.notAKey')).toBe('child.notAKey');
    expect(onMissingKey).toHaveBeenCalledWith('child.notAKey', 'en');
  });

  it('pseudo-localizes the long pseudo-locale after formatting', () => {
    const text = createI18n('en-XA').t('child.placeholder.body', { count: 11 });

    expect(text).toMatch(/^\[11 ĝåɱéš åŕé öñ ţĥé ŵåý\. ·+\]$/);
  });

  it('keeps English words in the right-to-left pseudo-locale', () => {
    expect(createI18n('en-XB').t('child.title')).toMatch(/^\[Learnofun ·+\]$/);
  });

  it('switches locale at runtime', () => {
    const i18n = createI18n('en');
    const seen: string[] = [];
    i18n.onLocaleChange((locale) => seen.push(locale));
    i18n.changeLocale('en-XA');

    expect(i18n.t('child.title')).toMatch(/^\[Ļéåŕñöƒûñ ·+\]$/);
    expect(i18n.locale).toBe('en-XA');
    expect(seen).toEqual(['en-XA']);
  });

  it('says whether the catalog has a key', () => {
    const i18n = createI18n('en');

    expect(i18n.has('child.title')).toBe(true);
    expect(i18n.has('child.notAKey')).toBe(false);
    expect(i18n.has('child')).toBe(false);
  });

  it('reports a message it cannot format, such as one missing its value', () => {
    const onError = vi.fn();
    createI18n('en', { onError }).t('child.placeholder.body');

    expect(onError).toHaveBeenCalledOnce();
  });

  it('formats pseudo-locales in English formats, for Intl', () => {
    expect(createI18n('en-XA').settings.locale).toBe('en');
  });
});
