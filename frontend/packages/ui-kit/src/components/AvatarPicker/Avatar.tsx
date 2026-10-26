import type { ReactNode } from 'react';

/**
 * Placeholder avatars: simple shapes, each in its own colour, so shape as well as colour tells
 * them apart. Never photos (CLAUDE.md rule 7) and never known characters.
 */
export const AVATARS = [
  'orange-circle',
  'blue-square',
  'green-triangle',
  'purple-star',
  'pink-heart',
  'teal-diamond',
] as const;

export type AvatarId = (typeof AVATARS)[number];

const SHAPES: Record<AvatarId, ReactNode> = {
  'orange-circle': <circle cx="24" cy="24" r="17" />,
  'blue-square': <rect x="8" y="8" width="32" height="32" rx="6" />,
  'green-triangle': <path d="M24 7l18 32H6z" />,
  'purple-star': (
    <path d="M24 5l5.6 11.6 12.8 1.8-9.3 9 2.2 12.7L24 34l-11.3 6.1 2.2-12.7-9.3-9 12.8-1.8z" />
  ),
  'pink-heart': <path d="M24 41S6 30 6 18a9 9 0 0 1 18-2 9 9 0 0 1 18 2c0 12-18 23-18 23z" />,
  'teal-diamond': <path d="M24 5l17 19-17 19L7 24z" />,
};

/** An avatar picture. Decorative: whatever shows it supplies the accessible name. */
export function Avatar({ id }: { id: AvatarId }) {
  return (
    <svg
      className={`lf-avatar lf-avatar--${id}`}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      {SHAPES[id]}
    </svg>
  );
}

export function isAvatarId(value: string): value is AvatarId {
  return (AVATARS as readonly string[]).includes(value);
}
