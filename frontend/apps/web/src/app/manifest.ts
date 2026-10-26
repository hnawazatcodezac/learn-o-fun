import type { MetadataRoute } from 'next';
import { colour } from './design-tokens';

export const dynamic = 'force-static';

/** The installable app's manifest (ADR 0024), with colours from the design system. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Learnofun',
    short_name: 'Learnofun',
    lang: 'en',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: colour('play-ground'),
    theme_color: colour('navy'),
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
