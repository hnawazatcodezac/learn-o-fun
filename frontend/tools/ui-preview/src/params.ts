import {
  FONTS,
  TEXT_SCALES,
  THEMES,
  type Font,
  type TextScale,
  type Theme,
} from '@learnofun/ui-kit';
import { BANDS, COMPONENTS, type ComponentId, type PreviewBand } from './matrix';

export interface PreviewParams {
  component: ComponentId;
  band: PreviewBand;
  theme: Theme;
  reducedMotion: boolean;
  textScale: TextScale;
  font: Font;
  /** `?toolbar=hidden` hides the toolbar, so screenshots show only the component. */
  showToolbar: boolean;
}

function pick<T extends string>(options: readonly T[], value: string | null, fallback: T): T {
  return options.find((option) => option === value) ?? fallback;
}

export function readParams(search: string): PreviewParams {
  const params = new URLSearchParams(search);
  return {
    component: pick(COMPONENTS, params.get('component'), 'button'),
    band: pick(BANDS, params.get('band'), 'early-primary'),
    theme: pick(THEMES, params.get('theme'), 'system'),
    reducedMotion: params.get('motion') === 'reduced',
    textScale: TEXT_SCALES.find((scale) => String(scale) === params.get('textScale')) ?? 1,
    font: pick(FONTS, params.get('font'), 'default'),
    showToolbar: params.get('toolbar') !== 'hidden',
  };
}

/** Keeps the preview's settings in the URL, so any combination can be linked to and reloaded. */
export function writeParams(params: PreviewParams) {
  const url = new URL(window.location.href);
  url.searchParams.set('component', params.component);
  url.searchParams.set('band', params.band);
  url.searchParams.set('theme', params.theme);
  const optional: [string, string | undefined][] = [
    ['motion', params.reducedMotion ? 'reduced' : undefined],
    ['textScale', params.textScale === 1 ? undefined : String(params.textScale)],
    ['font', params.font === 'default' ? undefined : params.font],
  ];
  for (const [name, value] of optional) {
    if (value === undefined) url.searchParams.delete(name);
    else url.searchParams.set(name, value);
  }
  window.history.replaceState(null, '', url);
}
