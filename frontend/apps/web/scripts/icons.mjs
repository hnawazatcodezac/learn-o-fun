// Renders the app's placeholder icons (ADR 0024): a sun disc on navy, in the design system's
// colours, with no letters, until the logo replaces them. Chromium from Playwright draws them.
//
// Usage: npm run icons -w @learnofun/web. The files go to public/icons and are kept in the repo.
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(
  readFileSync(join(here, '..', '..', '..', '..', 'docs', 'design-system', 'tokens.json'), 'utf8'),
);
const out = join(here, '..', 'public', 'icons');

/** A colour token's value in the light theme. */
export function colour(name) {
  const token = tokens.color.tokens.find((candidate) => candidate.name === name);
  if (!token) throw new Error(`No colour token ${name}`);
  return typeof token.value === 'string' ? token.value : token.value.light;
}

/**
 * The icon, as SVG on a 100-unit square: navy to the edges, and the sun disc in the middle. A
 * maskable icon keeps its disc inside the central 80% safe zone; the plain one may be larger.
 */
export function iconSvg({ maskable }) {
  const radius = maskable ? 24 : 30;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${colour('navy')}"/><circle cx="50" cy="50" r="${String(radius)}" fill="${colour('sun')}"/></svg>`;
}

/** Every icon file: its name, size and whether it is maskable. */
export const ICONS = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon-180.png', size: 180, maskable: true },
];

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'icon.svg'), iconSvg({ maskable: false }));
  const browser = await chromium.launch();
  for (const { file, size, maskable } of ICONS) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(
      `<style>html,body{margin:0}svg{display:block;width:${String(size)}px;height:${String(size)}px}</style>${iconSvg({ maskable })}`,
    );
    await page.screenshot({ path: join(out, file), omitBackground: false });
    await page.close();
    console.log(`Wrote ${file}`);
  }
  await browser.close();
}
