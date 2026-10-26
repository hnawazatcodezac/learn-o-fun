import type { PlaySettings } from '@learnofun/contracts';
import type { Appearance } from '../../appearance/AppearanceProvider';

/** The appearance a child's play settings call for. Sound, music, voice and timers go to the game shell. */
export function appearanceFromSettings(
  settings: PlaySettings,
): Pick<Appearance, 'theme' | 'reducedMotion' | 'textScale' | 'font'> {
  return {
    theme: settings.highContrast ? 'contrast' : 'system',
    reducedMotion: settings.reducedMotion,
    textScale: settings.textScale,
    font: settings.dyslexiaFont ? 'dyslexia' : 'default',
  };
}
