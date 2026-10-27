// Builds the app's service worker into a static export (ADR 0024, ADR 0042): esbuild bundles
// src/sw/sw.ts, then Serwist lists every file of the export in it, so the app opens with no
// network. Run after `next build`: node scripts/build-sw.mjs <export folder>
import { injectManifest } from '@serwist/build';
import { build } from 'esbuild';

const outDir = process.argv[2] ?? 'out';
const swDest = `${outDir}/sw.js`;
const mockApi = process.env.NEXT_PUBLIC_API_MODE !== 'live';

await build({
  entryPoints: ['src/sw/sw.ts'],
  bundle: true,
  // A classic script, since it imports MSW's worker with importScripts.
  format: 'iife',
  target: 'es2022',
  minify: true,
  outfile: swDest,
  define: { __MOCK_API__: String(mockApi) },
  logLevel: 'warning',
});

const { count, size, warnings } = await injectManifest({
  swSrc: swDest,
  swDest,
  globDirectory: outDir,
  // Every page and its data for Next.js's router (.txt), and the fonts for Latin text: next/font
  // keeps the files' names, such as baloo_2_latin_500_normal and baloo_2_latin_ext_500_normal.
  globPatterns: [
    '**/*.{js,css,html,png,svg,txt,webmanifest}',
    '_next/static/media/*_latin_*.woff2',
  ],
  // MSW's worker comes into this one by importScripts, so it is fetched, not precached.
  globIgnores: ['sw.js', 'mockServiceWorker.js'],
  // Next.js names its built files by their content, so they never need a revision.
  dontCacheBustURLsMatching: /^_next\/static\//,
  injectionPoint: 'self.__SW_MANIFEST',
});
for (const warning of warnings) console.warn(warning);
console.log(`Service worker: ${String(count)} files precached, ${(size / 1024).toFixed(0)} kB.`);
