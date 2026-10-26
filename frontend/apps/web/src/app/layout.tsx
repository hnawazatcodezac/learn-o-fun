import '@learnofun/ui-kit/styles.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AppProviders } from '../shared/AppProviders';
import '../styles.css';
import { colour } from './design-tokens';

export const metadata: Metadata = {
  title: 'Learnofun',
  icons: {
    icon: { url: '/icons/icon.svg', type: 'image/svg+xml' },
    apple: '/icons/apple-touch-icon-180.png',
  },
};

/** The page's theme colour, from the design system (ADR 0024). */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: colour('navy'),
};

/**
 * The one page every address of the app shares: the child area at / and the parent dashboard at
 * /parent (ADR 0007). The language and direction follow the child's locale once it is known.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
