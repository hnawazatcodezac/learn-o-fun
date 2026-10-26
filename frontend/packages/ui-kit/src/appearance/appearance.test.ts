import { describe, expect, it } from 'vitest';
import { appearanceAttributes } from './AppearanceProvider';
import { gateModeForBand, isExperienceBand } from './bands';

describe('appearanceAttributes', () => {
  it('leaves everything to the device by default, with no band for the parent dashboard', () => {
    expect(appearanceAttributes({})).toEqual({
      'data-band': undefined,
      'data-theme': undefined,
      'data-motion': undefined,
      'data-text-scale': undefined,
      'data-font': undefined,
    });
  });

  it('sets the band and a chosen theme', () => {
    const attributes = appearanceAttributes({ band: 'early-years', theme: 'contrast' });

    expect(attributes['data-band']).toBe('early-years');
    expect(attributes['data-theme']).toBe('contrast');
  });

  it('does not set a theme when following the device', () => {
    expect(appearanceAttributes({ theme: 'system' })['data-theme']).toBeUndefined();
  });

  it('marks reduced motion when the setting is on', () => {
    expect(appearanceAttributes({ reducedMotion: true })['data-motion']).toBe('reduced');
  });

  it('sets the text size only when it is larger than normal', () => {
    expect(appearanceAttributes({ textScale: 1 })['data-text-scale']).toBeUndefined();
    expect(appearanceAttributes({ textScale: 1.5 })['data-text-scale']).toBe('1.5');
  });

  it('marks the dyslexia-friendly font', () => {
    expect(appearanceAttributes({ font: 'dyslexia' })['data-font']).toBe('dyslexia');
    expect(appearanceAttributes({ font: 'default' })['data-font']).toBeUndefined();
  });
});

describe('isExperienceBand', () => {
  it('accepts the two bands for ages 3–8', () => {
    expect(isExperienceBand('early-years')).toBe(true);
    expect(isExperienceBand('early-primary')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isExperienceBand('teen')).toBe(false);
  });
});

describe('gateModeForBand', () => {
  it('uses the times-table challenge for ages 3–8 (plan 8.1)', () => {
    expect(gateModeForBand('early-years')).toBe('challenge');
    expect(gateModeForBand('early-primary')).toBe('challenge');
  });
});
