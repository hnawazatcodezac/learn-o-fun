import {
  PlacementItem,
  type Item,
  type ItemTemplate,
  type NumberLineAdditionLevel,
  type NumberLineAdditionTemplate,
} from '@learnofun/contracts';
import { createRandom, deriveSeed } from './random';
import type { ItemMaker } from './session';
import { fieldCandidates, fieldFeatures, fieldItem, fieldItemId } from './field';
import {
  bondsCandidates,
  bondsItem,
  bondsItemId,
  countingCandidates,
  countingItem,
  countingItemId,
  makeTenCandidates,
  makeTenItem,
  makeTenItemId,
  tenFrameFeatures,
} from './ten-frame';

/** Sums that go past this cross ten, the hardest step in adding within 20. */
const TEN = 10;

/** Settings for the generators (`.claude/rules/learning-core.md`: no numbers hidden in code). */
export interface GeneratorConfig {
  /** Decimal places kept in an item's difficulty, so a sum of weights reads -0.9, not -0.8999…. */
  difficultyDecimals: number;
}

export const DEFAULT_GENERATOR_CONFIG: GeneratorConfig = { difficultyDecimals: 2 };

/** What makes one number-line addition item: start on `start`, hop `hops` times. */
export interface AdditionFeatures {
  start: number;
  hops: number;
  labelEvery: number;
}

const crossesTen = (start: number, sum: number) => start < TEN && sum > TEN;

/** Every item a level allows, in a fixed order, so a seed always picks the same one. */
export function additionCandidates(
  template: NumberLineAdditionTemplate,
  level: NumberLineAdditionLevel,
): AdditionFeatures[] {
  const candidates: AdditionFeatures[] = [];
  // Starting on the line's first number would make "hop to the second number" the right answer.
  for (let start = template.line.min + 1; start < template.line.max; start += 1) {
    for (let hops = level.minHops; hops <= level.maxHops; hops += 1) {
      const sum = start + hops;
      if (sum < level.minSum || sum > level.maxSum || sum > template.line.max) continue;
      const crosses = crossesTen(start, sum);
      if (level.crossesTen === 'always' && !crosses) continue;
      if (level.crossesTen === 'never' && crosses) continue;
      candidates.push({ start, hops, labelEvery: level.labelEvery });
    }
  }
  return candidates;
}

/** A readable ID that names the item's features, so the item can be rebuilt from it (ADR 0009). */
export function additionItemId(template: NumberLineAdditionTemplate, features: AdditionFeatures) {
  const { start, hops, labelEvery } = features;
  const labels = labelEvery === 1 ? '' : `-every-${String(labelEvery)}`;
  return `${template.id}-${String(start)}-plus-${String(hops)}${labels}`;
}

/**
 * The wrong landings the brief names, by position. A position two kinds of mistake would both
 * explain is left out rather than guessed, and so is anything off the line or at the answer.
 */
function additionMisconceptions(template: NumberLineAdditionTemplate, start: number, sum: number) {
  const { misconceptions: ids, line } = template;
  const hops = sum - start;
  const claims = new Map<number, Set<string>>();
  const claim = (position: number, id: string) => {
    claims.set(position, (claims.get(position) ?? new Set()).add(id));
  };
  claim(sum - 1, ids.countsTheStart);
  claim(sum + 1, ids.extraHop);
  claim(hops, ids.goesToTheNumber);
  for (let position = line.min; position < start; position += 1) claim(position, ids.hopsBackwards);

  return [...claims]
    .filter(([position, found]) => {
      return found.size === 1 && position !== sum && position >= line.min && position <= line.max;
    })
    .map(([position, found]) => ({ position, misconceptionId: [...found][0] ?? '' }))
    .sort((a, b) => a.position - b.position);
}

/** Builds the item for a set of features: its skills, difficulty and misconceptions. */
export function additionItem(
  template: NumberLineAdditionTemplate,
  features: AdditionFeatures,
  config: GeneratorConfig = DEFAULT_GENERATOR_CONFIG,
): Item {
  const { start, hops, labelEvery } = features;
  const sum = start + hops;
  const weights = template.difficulty;
  const difficulty =
    weights.base +
    (sum > TEN ? weights.sumAboveTen : 0) +
    (hops >= weights.largeHopsFrom ? weights.largeHops : 0) +
    (crossesTen(start, sum) ? weights.crossesTen : 0) +
    (labelEvery > 1 ? weights.landmarksOnly : 0);
  return PlacementItem.parse({
    id: additionItemId(template, features),
    type: 'placement',
    skillIds: sum <= TEN ? template.skillIdsWithinTen : template.skillIds,
    difficulty: Number(difficulty.toFixed(config.difficultyDecimals)),
    surface: {
      kind: 'line',
      min: template.line.min,
      max: template.line.max,
      start,
      target: sum,
      tolerance: 0,
      labelEvery,
      misconceptions: additionMisconceptions(template, start, sum),
    },
  });
}

function levelOf<Level>(template: { id: string; levels: readonly Level[] }, level: number): Level {
  const found = template.levels[level];
  if (!found) {
    throw new Error(`${template.id} has levels 0 to ${String(template.levels.length - 1)}`);
  }
  return found;
}

const made = (items: readonly (Item | undefined)[]): Item[] =>
  items.filter((item): item is Item => item !== undefined);

/** One item a level allows: its ID, cheap to know, and the item, built only when it is chosen. */
interface Candidate {
  id: string;
  build: () => Item | undefined;
}

/** A level's candidates in a fixed order, so a seed always picks the same one (plan 6.5). */
function levelCandidates(
  template: ItemTemplate,
  level: number,
  config: GeneratorConfig,
): Candidate[] {
  switch (template.generator) {
    case 'number-line-addition':
      return additionCandidates(template, levelOf(template, level)).map((features) => ({
        id: additionItemId(template, features),
        build: () => additionItem(template, features, config),
      }));
    case 'ten-frame-fill-to':
      return countingCandidates(template, levelOf(template, level)).map((features) => ({
        id: countingItemId(template, features),
        build: () => countingItem(template, features, config),
      }));
    case 'ten-frame-fill-up':
      return bondsCandidates(template, levelOf(template, level)).map((features) => ({
        id: bondsItemId(template, features),
        build: () => bondsItem(template, features, config),
      }));
    case 'ten-frame-make-ten':
      return makeTenCandidates(template, levelOf(template, level)).map((features) => ({
        id: makeTenItemId(template, features),
        build: () => makeTenItem(template, features, config),
      }));
    case 'field-equal-groups':
    case 'field-array':
      return fieldCandidates(template, levelOf(template, level)).map((features) => ({
        id: fieldItemId(template, features),
        build: () => fieldItem(template, features, config),
      }));
  }
}

/**
 * Every item a level of a template allows, built, in a fixed order (plan 6.5). Each generator
 * reads its own kind of template (ADR 0015, ADR 0037).
 */
export function levelItems(
  template: ItemTemplate,
  level: number,
  config: GeneratorConfig = DEFAULT_GENERATOR_CONFIG,
): Item[] {
  return made(levelCandidates(template, level, config).map((candidate) => candidate.build()));
}

/** Picks from the seed, preferring what is not in `exclude`, and builds only the one picked. */
function pickFrom(
  template: ItemTemplate,
  level: number,
  candidates: readonly Candidate[],
  seed: number,
  exclude: ReadonlySet<string>,
): Item {
  const fresh = candidates.filter((candidate) => !exclude.has(candidate.id));
  const pool = fresh.length > 0 ? fresh : candidates;
  const [first, ...rest] = pool;
  if (!first) throw new Error(`Level ${String(level)} of ${template.id} allows no items`);
  const item = createRandom(seed)
    .pick([first, ...rest])
    .build();
  if (!item) throw new Error(`${template.id} made no item at level ${String(level)}`);
  return item;
}

/**
 * Makes one item at a difficulty level of a template (plan 6.5). The same template, level and
 * seed always give the same item. Items in `exclude`, by ID, are skipped unless the level has
 * nothing else left.
 */
export function generateItem(
  template: ItemTemplate,
  level: number,
  seed: number,
  exclude: ReadonlySet<string> = new Set(),
  config: GeneratorConfig = DEFAULT_GENERATOR_CONFIG,
): Item {
  return pickFrom(template, level, levelCandidates(template, level, config), seed, exclude);
}

/**
 * Makes the items for a session, one per level in `levels`, each from its own stream of the
 * seed, and never the same item twice while a level has others (plan 4.2).
 */
export function generateItems(
  template: ItemTemplate,
  levels: readonly number[],
  seed: number,
  config: GeneratorConfig = DEFAULT_GENERATOR_CONFIG,
): Item[] {
  const used = new Set<string>();
  return levels.map((level, index) => {
    const itemSeed = deriveSeed(seed, `item-${String(index)}`);
    const item = generateItem(template, level, itemSeed, used, config);
    used.add(item.id);
    return item;
  });
}

/**
 * Makes a template's items on demand for the in-session policy (ADR 0032). Each level's typical
 * difficulty is the average over every item the level allows, so the policy can aim for the
 * success zone.
 */
export function templateMaker(
  template: ItemTemplate,
  config: GeneratorConfig = DEFAULT_GENERATOR_CONFIG,
): ItemMaker {
  // Each level's items are built once, for its difficulty and for every item made at it.
  const built = template.levels.map((_, level) => levelItems(template, level, config));
  const levelDifficulty = built.map(
    (items) => items.reduce((sum, item) => sum + item.difficulty, 0) / Math.max(1, items.length),
  );
  const levels = built.map((items) => items.map((item) => ({ id: item.id, build: () => item })));
  return {
    levelDifficulty,
    make: (level, seed, used) => pickFrom(template, level, levels[level] ?? [], seed, used),
  };
}

/**
 * Rebuilds a template's item from its ID alone, which names the item's features (ADR 0009), so an
 * answer can be graded again on the server without the session's seed (ADR 0028). Undefined for
 * an ID none of the templates makes.
 */
export function itemFromId(
  templates: readonly ItemTemplate[],
  itemId: string,
  config: GeneratorConfig = DEFAULT_GENERATOR_CONFIG,
): Item | undefined {
  for (const template of templates) {
    const prefix = `${template.id}-`;
    if (!itemId.startsWith(prefix)) continue;
    const item = rebuild(template, itemId.slice(prefix.length), config);
    // Only an ID the template would make itself, written the same way.
    if (item?.id === itemId) return item;
  }
  return undefined;
}

/** The item whose features `rest` names, or undefined if they make none. */
function rebuild(template: ItemTemplate, rest: string, config: GeneratorConfig): Item | undefined {
  if (template.generator === 'number-line-addition') {
    const match = /^(\d+)-plus-(\d+)(?:-every-(\d+))?$/.exec(rest);
    if (!match) return undefined;
    const [, start = '', hops = '', every] = match;
    try {
      return additionItem(
        template,
        { start: Number(start), hops: Number(hops), labelEvery: every ? Number(every) : 1 },
        config,
      );
    } catch {
      // Features off the template's line make no item.
      return undefined;
    }
  }
  if (template.generator === 'field-equal-groups' || template.generator === 'field-array') {
    const features = fieldFeatures(rest);
    return features ? fieldItem(template, features, config) : undefined;
  }
  const features = tenFrameFeatures(rest);
  if (!features) return undefined;
  if ('first' in features) {
    return template.generator === 'ten-frame-make-ten'
      ? makeTenItem(template, features, config)
      : undefined;
  }
  if (template.generator === 'ten-frame-fill-to') return countingItem(template, features, config);
  if (template.generator === 'ten-frame-fill-up') {
    return bondsItem(template, { shown: features.count, fruit: features.fruit }, config);
  }
  return undefined;
}

/**
 * A session's levels from easiest to hardest, spread evenly over the template's levels. A
 * placeholder until the in-session policy chooses items (FRONTEND-KICKOFF step 13).
 */
export function rampLevels(template: ItemTemplate, itemCount: number): number[] {
  const levels = template.levels.length;
  return Array.from({ length: itemCount }, (_, index) =>
    Math.min(levels - 1, Math.floor((index * levels) / itemCount)),
  );
}
