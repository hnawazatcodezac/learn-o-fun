// Serves a static export, as a static host would, for the Playwright suites and `npm run preview`
// (ADR 0041, ADR 0042): /today is today.html, / is index.html, and an unknown address gets
// 404.html with status 404. Usage: node scripts/serve-static.mjs <folder> [--port <n>]. The last
// --port wins, so `npm run preview -- --port <n>` serves an app on another port. Text files are
// gzipped for a browser that accepts it, as a static host does, so the performance budgets
// (ADR 0040) measure the bytes a real visit downloads.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { URL } from 'node:url';
import { createGzip } from 'node:zlib';

const args = process.argv.slice(2);
const root = resolve(args.find((arg) => !arg.startsWith('--')) ?? 'out');
const portFlag = args.lastIndexOf('--port');
const port = Number(portFlag >= 0 ? args[portFlag + 1] : 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

/** The file for a path inside the folder, if there is one. */
function fileFor(path) {
  const inside = normalize(join(root, path));
  if (inside !== root && !inside.startsWith(root + sep)) return undefined;
  for (const candidate of [inside, `${inside}.html`, join(inside, 'index.html')]) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // Try the next one.
    }
  }
  return undefined;
}

createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  const found = fileFor(path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path);
  const file = found ?? fileFor('/404.html');
  if (!file) {
    response.writeHead(404).end();
    return;
  }
  const type = TYPES[extname(file)] ?? 'application/octet-stream';
  const gzip =
    /^(?:text\/|application\/(?:json|manifest\+json)|image\/svg)/.test(type) &&
    /gzip/.test(request.headers['accept-encoding'] ?? '');
  response.writeHead(found ? 200 : 404, {
    'Content-Type': type,
    // Every response is fresh, so a new build is always the one served.
    'Cache-Control': 'no-cache',
    Vary: 'Accept-Encoding',
    ...(gzip ? { 'Content-Encoding': 'gzip' } : {}),
  });
  const stream = createReadStream(file);
  (gzip ? stream.pipe(createGzip()) : stream).pipe(response);
})
  .on('error', (error) => {
    console.error(error.message);
    process.exit(1);
  })
  .listen(port, () => {
    console.log(`Serving ${root} on http://localhost:${String(port)}`);
  });
