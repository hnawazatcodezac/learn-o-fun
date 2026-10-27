import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';
import { THEME_NAMES } from './theme-names';

/**
 * tailwind-merge, told the design system's names (ADR 0043), so `text-play-hero` is a size and
 * `text-ink` a colour, and a later class wins only over the one it really conflicts with.
 */
const merge = extendTailwindMerge({
  extend: {
    classGroups: {
      // A shadow token with the focus ring (tailwind.css): a shadow like any other.
      shadow: [{ 'shadow-with-focus': [...THEME_NAMES.shadow] }],
    },
    theme: {
      color: [...THEME_NAMES.color],
      spacing: [...THEME_NAMES.spacing],
      container: [...THEME_NAMES.container],
      radius: [...THEME_NAMES.radius],
      shadow: [...THEME_NAMES.shadow],
      font: [...THEME_NAMES.font],
      'font-weight': [...THEME_NAMES['font-weight']],
      text: [...THEME_NAMES.text],
      leading: [...THEME_NAMES.leading],
      breakpoint: [...THEME_NAMES.breakpoint],
    },
  },
});

/** Joins class names, conditional ones included, as `clsx` does, then resolves conflicts. */
export function cn(...values: ClassValue[]): string {
  return merge(clsx(values));
}
