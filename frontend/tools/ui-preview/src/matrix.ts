import type { ExperienceBand, Font, TextScale, Theme } from '@learnofun/ui-kit';

/** Every component with a preview page. The tests check each one in every combination below. */
export const COMPONENTS = [
  'button',
  'answer-tile',
  'card',
  'activity-card',
  'avatar-picker',
  'progress-trail',
  'dialog',
  'toast',
  'feedback',
  'celebration',
  'parental-gate',
  'settings-panel',
  'picture-pin',
  'skill-status',
] as const;
export type ComponentId = (typeof COMPONENTS)[number];

/** 'parent' previews the parent dashboard, which has no experience band. */
export const BANDS = ['early-years', 'early-primary', 'parent'] as const satisfies readonly (
  ExperienceBand | 'parent'
)[];
export type PreviewBand = (typeof BANDS)[number];

/** Components for the parent dashboard only, which the design system keeps out of the child app. */
const PARENT_ONLY: readonly ComponentId[] = ['skill-status'];

/** The bands a component is tested in: parent-only components only in the parent's world. */
export function bandsFor(component: ComponentId): readonly PreviewBand[] {
  return PARENT_ONLY.includes(component) ? ['parent'] : BANDS;
}

/** Themes the tests pin explicitly. The toolbar also offers 'system'. */
export const TESTED_THEMES = ['light', 'dark', 'contrast'] as const satisfies readonly Theme[];

export function previewUrl({
  textScale,
  font,
  ...options
}: {
  component: ComponentId;
  band: PreviewBand;
  theme: Theme;
  locale: string;
  textScale?: TextScale;
  font?: Font;
  /** Hides the toolbar, for screenshots of just the component. */
  toolbar?: 'hidden';
}): string {
  const params = new URLSearchParams(options);
  if (textScale !== undefined) params.set('textScale', String(textScale));
  if (font !== undefined) params.set('font', font);
  return `/?${params.toString()}`;
}
