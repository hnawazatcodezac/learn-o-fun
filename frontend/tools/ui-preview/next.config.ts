import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NextConfig } from 'next';

/** The workspace's own packages the preview shows: Next.js compiles their code. */
function workspacePackages(): string[] {
  const { dependencies = {} } = JSON.parse(
    readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
  ) as { dependencies?: Record<string, string> };
  return Object.keys(dependencies).filter((name) => name.startsWith('@learnofun/'));
}

/**
 * The UI preview as a static export (ADR 0042), as the web app is: one page in the browser, its
 * settings in the address. No development indicator, so screenshots of the development server show
 * only the preview (ADR 0006).
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
