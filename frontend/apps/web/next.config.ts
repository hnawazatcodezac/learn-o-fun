import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NextConfig } from 'next';

/**
 * `npm run build:e2e`: the test build the Playwright suites run, bundled as for production with
 * the development tools, into `out-e2e/` (ADR 0041).
 */
const testBuild =
  process.env.npm_lifecycle_event === 'build:e2e' || process.env.LEARNOFUN_BUILD === 'e2e';

/**
 * The development tools: the pseudo-locales and the Language menu, the mock API panel, the game
 * stories route, and MSW's own worker without caching. On the development server and in the test
 * build, never in production (ADR 0041).
 */
const devTools = process.env.NODE_ENV === 'development' || testBuild;

/** The workspace's own packages the app runs, the games included: Next.js compiles their code. */
function workspacePackages(): string[] {
  const names = (file: string) =>
    Object.keys(
      (JSON.parse(readFileSync(file, 'utf8')) as { dependencies?: Record<string, string> })
        .dependencies ?? {},
    ).filter((name) => name.startsWith('@learnofun/'));
  const registry = join(process.cwd(), '..', '..', 'packages', 'game-registry', 'package.json');
  return [...new Set([...names(join(process.cwd(), 'package.json')), ...names(registry)])];
}

/**
 * The web app as a static export (ADR 0042): the child area and the parent dashboard run in the
 * browser, so it works offline as a PWA and can be wrapped with Capacitor later. Next.js is never
 * the backend: all data comes from the API, through `packages/contracts`.
 */
const config: NextConfig = {
  output: 'export',
  ...(testBuild ? { distDir: 'out-e2e' } : {}),
  reactStrictMode: true,
  // No image optimization in a static export (.claude/rules/frontend.md).
  images: { unoptimized: true },
  transpilePackages: workspacePackages(),
  // The game stories route is a page only with the development tools.
  pageExtensions: devTools ? ['tsx', 'ts', 'dev.tsx'] : ['tsx', 'ts'],
  // Replaced when the code is built, so production leaves the development tools out entirely.
  compiler: { define: { __DEV_TOOLS__: devTools } },
  // `npm run typecheck` checks the types, with the workspace's own settings.
  typescript: { ignoreBuildErrors: true },
};

export default config;
