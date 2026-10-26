import {
  NumericItem,
  type Item,
  type TenFrameBondsLevel,
  type TenFrameBondsTemplate,
  type TenFrameCountingLevel,
  type TenFrameCountingTemplate,
  type TenFrameMakeTenLevel,
  type TenFrameMakeTenTemplate,
  type TenFrameScene,
} from '@learnofun/contracts';
import type { GeneratorConfig } from './templates';

/** One tray holds ten, in two rows of five (ADR 0037). */
const TRAY = 10;

/**
 * The wrong answers the brief names, each pointing to its misconception. An answer two mistakes
 * would both explain is left out rather than guessed, and so is the right answer and any answer
 * the trays could not show.
 */
function misconceptionsFor(
  claims: readonly (readonly [answer: number, misconceptionId: string])[],
  right: number,
  [least, most]: readonly [number, number],
) {
  const found = new Map<number, Set<string>>();
  for (const [answer, id] of claims) found.set(answer, (found.get(answer) ?? new Set()).add(id));
  return [...found]
    .filter(
      ([answer, ids]) => ids.size === 1 && answer !== right && answer >= least && answer <= most,
    )
    .map(([answer, ids]) => ({ answer, misconceptionId: [...ids][0] ?? '' }))
    .sort((a, b) => a.answer - b.answer);
}

/** A ten-frame item, checked by its contract: undefined if the features make no valid item. */
function tenFrameItem(
  fields: {
    id: string;
    skillIds: readonly string[];
    difficulty: number;
    answer: number;
    scene: TenFrameScene;
    misconceptions: { answer: number; misconceptionId: string }[];
  },
  config: GeneratorConfig,
): Item | undefined {
  const parsed = NumericItem.safeParse({
    id: fields.id,
    type: 'numeric',
    skillIds: fields.skillIds,
    difficulty: Number(fields.difficulty.toFixed(config.difficultyDecimals)),
    answer: { kind: 'decimal', value: fields.answer },
    tolerance: 0,
    acceptEquivalentFractions: false,
    scene: fields.scene,
    misconceptions: fields.misconceptions,
  });
  return parsed.success ? parsed.data : undefined;
}

/** What makes one counting item: the number the customer asks for, and the fruit. */
export interface CountingFeatures {
  count: number;
  fruit: string;
}

export function countingCandidates(
  template: TenFrameCountingTemplate,
  level: TenFrameCountingLevel,
): CountingFeatures[] {
  const candidates: CountingFeatures[] = [];
  for (let count = level.min; count <= level.max; count += 1) {
    for (const fruit of template.fruits) candidates.push({ count, fruit });
  }
  return candidates;
}

export const countingItemId = (template: TenFrameCountingTemplate, f: CountingFeatures) =>
  `${template.id}-${String(f.count)}-${f.fruit}`;

/** Fill the trays to `count`: a second tray above ten (the Ten Frame Café brief). */
export function countingItem(
  template: TenFrameCountingTemplate,
  features: CountingFeatures,
  config: GeneratorConfig,
): Item | undefined {
  const { count, fruit } = features;
  if (!template.fruits.includes(fruit)) return undefined;
  const trays = count > TRAY ? [0, 0] : [0];
  const { countsOneTwice } = template.misconceptions;
  return tenFrameItem(
    {
      id: countingItemId(template, features),
      skillIds: template.skillIds,
      difficulty:
        template.difficulty.base +
        template.difficulty.perFruit * count +
        (count > TRAY ? template.difficulty.aboveTen : 0),
      answer: count,
      scene: { kind: 'ten-frame', task: 'fill-to', trays, fruit },
      misconceptions: misconceptionsFor(
        [
          [count - 1, countsOneTwice],
          [count + 1, countsOneTwice],
        ],
        count,
        // Serving nothing is not counting a fruit twice.
        [1, TRAY * trays.length],
      ),
    },
    config,
  );
}

/** What makes one bonds-to-10 item: how many are already in the tray, and the fruit. */
export interface BondsFeatures {
  shown: number;
  fruit: string;
}

export function bondsCandidates(
  template: TenFrameBondsTemplate,
  level: TenFrameBondsLevel,
): BondsFeatures[] {
  const candidates: BondsFeatures[] = [];
  for (let shown = level.minShown; shown <= level.maxShown; shown += 1) {
    for (const fruit of template.fruits) candidates.push({ shown, fruit });
  }
  return candidates;
}

export const bondsItemId = (template: TenFrameBondsTemplate, f: BondsFeatures) =>
  `${template.id}-${String(f.shown)}-${f.fruit}`;

/** A tray with `shown` already in it: the answer is how many fill it. */
export function bondsItem(
  template: TenFrameBondsTemplate,
  features: BondsFeatures,
  config: GeneratorConfig,
): Item | undefined {
  const { shown, fruit } = features;
  if (!template.fruits.includes(fruit)) return undefined;
  const missing = TRAY - shown;
  const { difficulty, misconceptions: ids } = template;
  return tenFrameItem(
    {
      id: bondsItemId(template, features),
      skillIds: template.skillIds,
      difficulty:
        difficulty.base +
        difficulty.perMissing * missing +
        (missing >= difficulty.largeMissingFrom ? difficulty.largeMissing : 0),
      answer: missing,
      scene: { kind: 'ten-frame', task: 'fill-up', trays: [shown], fruit },
      misconceptions: misconceptionsFor(
        [
          [shown, ids.givesThePart],
          [TRAY, ids.countsAll],
        ],
        missing,
        [0, TRAY],
      ),
    },
    config,
  );
}

/** What makes one making-ten item: the two parts of the sum, and the fruit. */
export interface MakeTenFeatures {
  first: number;
  second: number;
  fruit: string;
}

export function makeTenCandidates(
  template: TenFrameMakeTenTemplate,
  level: TenFrameMakeTenLevel,
): MakeTenFeatures[] {
  const candidates: MakeTenFeatures[] = [];
  for (let first = level.minFirst; first <= level.maxFirst; first += 1) {
    for (let second = level.minSecond; second <= level.maxSecond; second += 1) {
      const total = first + second;
      if (total <= TRAY || total > 2 * TRAY) continue;
      for (const fruit of template.fruits) candidates.push({ first, second, fruit });
    }
  }
  return candidates;
}

export const makeTenItemId = (template: TenFrameMakeTenTemplate, f: MakeTenFeatures) =>
  `${template.id}-${String(f.first)}-plus-${String(f.second)}-${f.fruit}`;

/** Two trays, `first` and `second`: fill the first from the second, then say the total. */
export function makeTenItem(
  template: TenFrameMakeTenTemplate,
  features: MakeTenFeatures,
  config: GeneratorConfig,
): Item | undefined {
  const { first, second, fruit } = features;
  if (!template.fruits.includes(fruit)) return undefined;
  const total = first + second;
  const moved = TRAY - first;
  const { difficulty, misconceptions: ids } = template;
  return tenFrameItem(
    {
      id: makeTenItemId(template, features),
      skillIds: template.skillIds,
      difficulty:
        difficulty.base +
        (moved >= difficulty.farFrom ? difficulty.farFromTen : 0) +
        (total > 15 ? difficulty.aboveFifteen : 0),
      answer: total,
      scene: { kind: 'ten-frame', task: 'make-ten', trays: [first, second], fruit },
      misconceptions: misconceptionsFor(
        [
          [TRAY, ids.stopsAtTen],
          [total + moved, ids.countsMovedTwice],
        ],
        total,
        [0, 2 * TRAY],
      ),
    },
    config,
  );
}

/** The features an ID names, after the template's own ID and a dash: "13-pear", "8-plus-5-pear". */
export function tenFrameFeatures(
  rest: string,
): { count: number; fruit: string } | { first: number; second: number; fruit: string } | undefined {
  const pair = /^(\d+)-plus-(\d+)-([a-z][a-z0-9-]*)$/.exec(rest);
  if (pair) {
    const [, first = '', second = '', fruit = ''] = pair;
    return { first: Number(first), second: Number(second), fruit };
  }
  const single = /^(\d+)-([a-z][a-z0-9-]*)$/.exec(rest);
  if (!single) return undefined;
  const [, count = '', fruit = ''] = single;
  return { count: Number(count), fruit };
}
