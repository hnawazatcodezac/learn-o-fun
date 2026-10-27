import { describe, expect, it, vi } from 'vitest';
import { createI18n } from './create-i18n';
import { createTranslate } from './translate';

describe('createTranslate', () => {
  it('translates a key given as a plain string', () => {
    const key: string = 'games.demoChoice.instructions';

    expect(createTranslate(createI18n('en'))(key)).toBe('Choose the right answer.');
  });

  it('fills in ICU values', () => {
    const t = createTranslate(createI18n('en'));

    expect(t('ui.progress.label', { current: 2, total: 5 })).toBe('Question 2 of 5');
  });

  it('follows the current locale, including pseudo-locales', () => {
    const i18n = createI18n('en');
    const t = createTranslate(i18n);
    i18n.changeLocale('en-XA');

    expect(t('games.demoChoice.answers')).toMatch(/^\[Åñšŵéŕš ·+\]$/);
  });

  it('reports a missing key and shows the key', () => {
    const onMissingKey = vi.fn();
    const t = createTranslate(createI18n('en', { onMissingKey }));

    expect(t('games.unknown.title')).toBe('games.unknown.title');
    expect(onMissingKey).toHaveBeenCalledWith('games.unknown.title', 'en');
  });
});
