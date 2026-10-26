import { describe, expect, it, vi } from 'vitest';
import { createI18n } from './create-i18n';

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
    void i18n.changeLanguage('en-AE');

    expect(i18n.t('parent.title')).toBe('Learnofun for families');
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
    void i18n.changeLanguage('en-XA');

    expect(i18n.t('child.title')).toMatch(/^\[Ļéåŕñöƒûñ ·+\]$/);
  });
});
