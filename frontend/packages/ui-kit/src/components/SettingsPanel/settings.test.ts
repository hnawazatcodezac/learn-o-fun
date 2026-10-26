import { describe, expect, it } from 'vitest';
import { DEFAULT_PLAY_SETTINGS } from '@learnofun/contracts';
import { appearanceFromSettings } from './settings';

describe('appearanceFromSettings', () => {
  it('leaves appearance to the device by default', () => {
    expect(appearanceFromSettings(DEFAULT_PLAY_SETTINGS)).toEqual({
      theme: 'system',
      reducedMotion: false,
      textScale: 1,
      font: 'default',
    });
  });

  it('turns the reading and seeing settings into appearance', () => {
    expect(
      appearanceFromSettings({
        ...DEFAULT_PLAY_SETTINGS,
        highContrast: true,
        reducedMotion: true,
        textScale: 1.5,
        dyslexiaFont: true,
      }),
    ).toEqual({ theme: 'contrast', reducedMotion: true, textScale: 1.5, font: 'dyslexia' });
  });
});
