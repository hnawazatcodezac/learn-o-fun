import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NextConfig } from 'next';

/** The workspace's own packages the sandbox runs, the games included: Next.js compiles their code. */
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
 * The game sandbox as a static export (ADR 0042), as the web app is: one page in the browser, its
 * setup in the address. No development indicator, so it never covers the game.
 */
const config: NextConfig = {
  output: 'export',
  reactStrictMode: true,
  images: { unoptimized: true },
  transpilePackages: workspacePackages(),
  devIndicators: false,
  // `npm run typecheck` checks the types, with the workspace's own settings.
  typescript: { ignoreBuildErrors: true },
};

export default config;
