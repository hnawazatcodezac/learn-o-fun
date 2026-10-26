import { fileURLToPath } from 'node:url';
import { build } from 'vite';

/** Plan 6.7: a game's bundle stays under 1.5 MB, measured minified and uncompressed (ADR 0014). */
export const BUNDLE_BUDGET_BYTES = 1_500_000;

/**
 * The shared runtime, which every game uses and no game pays for. Libraries such as PixiJS or
 * Rive join this list when the first game brings them in.
 */
const SHARED = [/^@learnofun\//, /^zod(\/|$)/, /^react(-dom)?(\/|$)/];

/** Audio does not count toward the budget (plan 6.7). */
const AUDIO = /\.(?:aac|flac|m4a|mp3|oga|ogg|opus|wav|weba)$/i;

export interface BundleSize {
  bytes: number;
  files: { name: string; bytes: number }[];
}

const encoder = new TextEncoder();

/**
 * Builds a game's own code as a minified library, leaving out the shared runtime, and adds up
 * the JavaScript, CSS, images and fonts it produces.
 */
export async function measureGameBundle(gameId: string): Promise<BundleSize> {
  const entry = fileURLToPath(
    new URL(`../../../packages/games/${gameId}/src/index.ts`, import.meta.url),
  );
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      write: false,
      minify: true,
      lib: { entry, formats: ['es'], fileName: gameId },
      rolldownOptions: { external: (id) => SHARED.some((pattern) => pattern.test(id)) },
    },
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap((output) =>
    'output' in output ? output.output : [],
  );
  const files = outputs
    .filter((file) => !AUDIO.test(file.fileName))
    .map((file) => ({
      name: file.fileName,
      bytes:
        file.type === 'chunk'
          ? encoder.encode(file.code).byteLength
          : typeof file.source === 'string'
            ? encoder.encode(file.source).byteLength
            : file.source.byteLength,
    }));
  return { bytes: files.reduce((total, file) => total + file.bytes, 0), files };
}
