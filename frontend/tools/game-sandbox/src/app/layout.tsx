import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { FONT_FALLBACKS } from './fonts';

export const metadata: Metadata = { title: 'Learnofun' };

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

/** The sandbox's one page. Its language and direction follow the locale once it is known. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" style={FONT_FALLBACKS}>
      <body>{children}</body>
    </html>
  );
}
