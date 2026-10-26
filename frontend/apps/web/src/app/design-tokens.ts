import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface ColourToken {
  name: string;
  value: string | { light: string };
}

/**
 * A design-system colour in the light theme, for the page's theme colour and the web app manifest
 * (ADR 0024). Read from `tokens.json` when the static export is built, never at runtime.
 */
export function colour(name: string): string {
  const file = join(process.cwd(), '..', '..', '..', 'docs', 'design-system', 'tokens.json');
  const tokens = JSON.parse(readFileSync(file, 'utf8')) as { color: { tokens: ColourToken[] } };
  const token = tokens.color.tokens.find((candidate) => candidate.name === name);
  if (!token) throw new Error(`No colour token ${name}`);
  return typeof token.value === 'string' ? token.value : token.value.light;
}
