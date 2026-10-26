import { describe, expect, it } from 'vitest';
import { localizeContent } from './content';

describe('localizeContent', () => {
  it('uses the text for the locale', () => {
    expect(localizeContent({ en: 'colour', 'en-US': 'color' }, 'en')).toBe('colour');
  });

  it('falls back to the language, then English, then anything', () => {
    expect(localizeContent({ en: 'What is 2 + 3?' }, 'en')).toBe('What is 2 + 3?');
    expect(localizeContent({ fr: 'Bonjour' }, 'en')).toBe('Bonjour');
    expect(localizeContent({}, 'en')).toBe('');
  });

  it('pseudo-localizes content in the pseudo-locales', () => {
    expect(localizeContent({ en: 'What is 2 + 3?' }, 'en-XA')).toMatch(/^\[Ŵĥåţ îš 2 \+ 3\? ·+\]$/);
    expect(localizeContent({ en: 'Five' }, 'en-XB')).toMatch(/^\[Five ·+\]$/);
  });
});
