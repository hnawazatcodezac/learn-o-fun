// Scaffolds a new game package from tools/create-game/template (plan 6.8, FRONTEND-KICKOFF step 7):
// the manifest, a starter GameModule, a brief to fill in, tests and sandbox stories. It also
// registers the game and adds its interface strings to the English catalog.
//
// Usage: npm run create-game -- <game-id> [--name "Display name"]
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const templateDir = join(root, 'tools', 'create-game', 'template');
// Each list has the marker line, followed by one lazy import per game, kept sorted.
const LISTS = [
  {
    file: join(root, 'packages', 'game-registry', 'src', 'registry.ts'),
    packageJson: join(root, 'packages', 'game-registry', 'package.json'),
    line: (packageName) => `  '${id}': () => import('${packageName}'),`,
  },
  {
    // The conformance suite's list of games (ADR 0014).
    file: join(root, 'tools', 'conformance', 'src', 'games.ts'),
    packageJson: join(root, 'tools', 'conformance', 'package.json'),
    line: (packageName) => `  '${id}': () => import('${packageName}/conformance'),`,
  },
];
const catalogFile = join(root, 'packages', 'i18n', 'src', 'catalogs', 'en.json');
const MARKER = '  // create-game: new games go below this line.\n';

function fail(message) {
  console.error(`create-game: ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const id = args[0];
if (!id || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id)) {
  fail(
    'give a game ID of lowercase words joined by hyphens, such as tile-farm.\n' +
      'Usage: npm run create-game -- <game-id> [--name "Display name"]',
  );
}
const nameIndex = args.indexOf('--name');
const name =
  nameIndex === -1
    ? id
        .split('-')
        .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
        .join(' ')
    : args[nameIndex + 1];
if (!name) fail('--name needs a value');

const camel = id.replace(/-([a-z0-9])/g, (_match, letter) => letter.toUpperCase());
const packageName = `@learnofun/game-${id}`;
const target = join(root, 'packages', 'games', id);
if (existsSync(target)) fail(`${relative(root, target)} already exists`);

const values = { id, name, camel, package: packageName };
const render = (text) =>
  text.replace(/\{\{(\w+)\}\}/g, (match, key) => (key in values ? values[key] : match));

/** Copies the template, filling in the placeholders and dropping the .tpl extension. */
function copy(from, to) {
  for (const entry of readdirSync(from)) {
    const source = join(from, entry);
    if (statSync(source).isDirectory()) {
      copy(source, join(to, entry));
      continue;
    }
    const file = join(to, entry.replace(/\.tpl$/, ''));
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, render(readFileSync(source, 'utf8')));
  }
}

/** Adds the game to the game registry and the conformance suite, keeping each list sorted. */
function register() {
  for (const list of LISTS) {
    const source = readFileSync(list.file, 'utf8');
    const [head, tail] = source.split(MARKER);
    if (tail === undefined) fail(`the marker line is missing from ${relative(root, list.file)}`);
    const end = tail.indexOf('};');
    const entries = tail
      .slice(0, end)
      .split('\n')
      .filter((line) => line.trim() !== '')
      .concat(list.line(packageName))
      .sort();
    writeFileSync(list.file, `${head}${MARKER}${entries.join('\n')}\n${tail.slice(end)}`);

    const pkg = JSON.parse(readFileSync(list.packageJson, 'utf8'));
    pkg.dependencies = Object.fromEntries(
      Object.entries({ ...pkg.dependencies, [packageName]: '*' }).sort(([a], [b]) =>
        a.localeCompare(b),
      ),
    );
    writeFileSync(list.packageJson, `${JSON.stringify(pkg, null, 2)}\n`);
  }
}

/** Adds the starter game's interface strings to the English catalog. */
function addStrings() {
  const catalog = JSON.parse(readFileSync(catalogFile, 'utf8'));
  catalog.games = {
    ...catalog.games,
    [camel]: {
      title: name,
      instructions: 'Choose the right answer.',
      answers: 'Answers',
      hintCrossedOut: 'Here’s a hint: one answer is crossed out.',
      hintLookAgain: 'Here’s a hint: look at each answer again.',
    },
  };
  writeFileSync(catalogFile, `${JSON.stringify(catalog, null, 2)}\n`);
}

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) fail(`${command} ${commandArgs.join(' ')} failed`);
}

copy(templateDir, target);
register();
addStrings();
run('npx', [
  'prettier',
  '--write',
  relative(root, target),
  ...LISTS.map((list) => relative(root, list.file)),
  relative(root, catalogFile),
]);
run('npm', ['install', '--no-fund', '--no-audit']);

console.log(`
Created ${packageName} in ${relative(root, target)}.

Next:
  1. Fill in ${relative(root, join(target, 'BRIEF.md'))} and have the learning designer review it.
  2. Try the starter game in the sandbox: npm run dev:sandbox
  3. Replace the mechanic in src/game.ts, and the stories in src/stories.ts.
  4. Keep conformance/driver.ts answering with the keyboard, and run npm run conformance.
`);
