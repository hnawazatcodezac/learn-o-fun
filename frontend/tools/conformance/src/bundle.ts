import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, type Plugin } from 'esbuild';

/** Plan 6.7: a game's bundle stays under 1.5 MB, measured minified and uncompressed (ADR 0014). */
export const BUNDLE_BUDGET_BYTES = 1_500_000;

/**
 * The shared runtime, which every game uses and no game pays for. Libraries such as PixiJS or
 * Rive join this list when the first game brings them in.
 */
const SHARED = [/^@learnofun\//, /^zod(\/|$)/, /^react(-dom)?(\/|$)/];

/** Audio does not count toward the budget (plan 6.7). */
const AUDIO = /\.(?:aac|flac|m4a|mp3|oga|ogg|opus|wav|weba)$/i;

/** The files a game may bring besides its code, each counted as a file of its own. */
const ASSETS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.avif',
  '.gif',
  '.svg',
  '.woff',
  '.woff2',
  '.riv',
  '.aac',
  '.flac',
  '.m4a',
  '.mp3',
  '.oga',
  '.ogg',
  '.opus',
  '.wav',
  '.weba',
] as const;

export interface BundleSize {
  bytes: number;
  files: { name: string; bytes: number }[];
}

/** Leaves the shared runtime out of the bundle. */
const sharedRuntime: Plugin = {
  name: 'learnofun-shared-runtime',
  setup(builder) {
    builder.onResolve({ filter: /.*/ }, ({ path, kind }) =>
      kind !== 'entry-point' && SHARED.some((pattern) => pattern.test(path))
        ? { path, external: true }
        : undefined,
    );
  },
};

/**
 * Builds a game's own code as a minified ES module with esbuild, leaving out the shared runtime,
 * and adds up the JavaScript, CSS, images and fonts it produces (ADR 0042).
 */
export async function measureGameBundle(gameId: string): Promise<BundleSize> {
  const entry = fileURLToPath(
    new URL(`../../../packages/games/${gameId}/src/index.ts`, import.meta.url),
  );
  const result = await build({
    entryPoints: { [gameId]: entry },
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    write: false,
    outdir: 'measure',
    logLevel: 'silent',
    loader: Object.fromEntries(ASSETS.map((extension) => [extension, 'file'])),
    plugins: [sharedRuntime],
  });
  const files = result.outputFiles
    .filter((file) => !AUDIO.test(file.path))
    .map((file) => ({ name: basename(file.path), bytes: file.contents.byteLength }));
  return { bytes: files.reduce((total, file) => total + file.bytes, 0), files };
}
