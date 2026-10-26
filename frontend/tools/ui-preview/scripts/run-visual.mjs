// Runs the screenshot tests against Chromium inside Playwright's Docker image, so screenshots
// match on every machine and in CI (ADR 0006). Needs Docker running. Extra arguments go to
// `playwright test`, for example: npm run visual -- --update-snapshots
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { version } = require('@playwright/test/package.json');
const cli = require.resolve('@playwright/test/cli');

const image = `mcr.microsoft.com/playwright:v${version}-noble`;
const container = 'learnofun-visual-browser';
const port = 3000;
const startupTimeoutMs = 120_000;

function docker(args, options = {}) {
  return spawnSync('docker', args, { encoding: 'utf8', ...options });
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitUntilListening() {
  const deadline = Date.now() + startupTimeoutMs;
  while (Date.now() < deadline) {
    const logs = docker(['logs', container]);
    if (`${logs.stdout}${logs.stderr}`.includes('Listening on')) return;
    await sleep(500);
  }
  throw new Error(`The browser in ${image} did not start within ${startupTimeoutMs / 1000} s`);
}

function runPlaywright(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cli, 'test', '--project=visual', ...args], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PW_TEST_CONNECT_WS_ENDPOINT: `ws://127.0.0.1:${port}/`,
        PW_TEST_CONNECT_EXPOSE_NETWORK: '<loopback>',
        // The screenshots stay on the development server for now (playwright.config.ts).
        LEARNOFUN_SCREENSHOTS: '1',
      },
    });
    child.on('exit', (code) => {
      resolve(code ?? 1);
    });
  });
}

docker(['rm', '--force', container], { stdio: 'ignore' });
const started = docker(
  [
    'run',
    '--detach',
    '--rm',
    '--init',
    '--name',
    container,
    '--publish',
    `127.0.0.1:${port}:${port}`,
    '--user',
    'pwuser',
    '--workdir',
    '/home/pwuser',
    image,
    '/bin/sh',
    '-c',
    `npx -y playwright@${version} run-server --port ${port} --host 0.0.0.0`,
  ],
  { stdio: 'inherit' },
);
if (started.status !== 0) {
  console.error('Could not start the screenshot browser. Is Docker running?');
  process.exit(1);
}

try {
  await waitUntilListening();
  process.exitCode = await runPlaywright(process.argv.slice(2));
} finally {
  docker(['stop', container], { stdio: 'ignore' });
}
