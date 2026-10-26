import { NumericItem, type FieldLevel, type FieldTemplate, type Item } from '@learnofun/contracts';
import type { GeneratorConfig } from './templates';

/** What makes one field item: the rows, their length, and the crop (ADR 0038). */
export interface FieldFeatures {
  rows: number;
  rowLength: number;
  crop: string;
}

/** Every item a level allows, in a fixed order: rows, then row lengths, then crops. */
export function fieldCandidates(template: FieldTemplate, level: FieldLevel): FieldFeatures[] {
  const candidates: FieldFeatures[] = [];
  for (let rows = level.minRows; rows <= level.maxRows; rows += 1) {
    for (const rowLength of level.rowLengths) {
      for (const crop of template.crops) candidates.push({ rows, rowLength, crop });
    }
  }
  return candidates;
}

export const fieldItemId = (template: FieldTemplate, f: FieldFeatures) =>
  `${template.id}-${String(f.rows)}-rows-of-${String(f.rowLength)}-${f.crop}`;

/**
 * The wrong answers the Tile Farm brief names, each pointing to its misconception. An answer two
 * mistakes would both explain is left out, and so is the right answer, and a count of nothing.
 */
function misconceptionsFor(template: FieldTemplate, rows: number, rowLength: number) {
  const ids = template.misconceptions;
  const right = rows * rowLength;
  const claims: (readonly [number, string])[] = [
    [rows + rowLength, ids.addsTheNumbers],
    [rowLength, ids.countsOneRow],
    [rows, ids.countsTheRows],
    [(rows - 1) * rowLength, ids.skipsARow],
    [(rows + 1) * rowLength, ids.skipsARow],
  ];
  const found = new Map<number, Set<string>>();
  for (const [answer, id] of claims) found.set(answer, (found.get(answer) ?? new Set()).add(id));
  return [...found]
    .filter(([answer, claimed]) => claimed.size === 1 && answer !== right && answer >= 1)
    .map(([answer, claimed]) => ({ answer, misconceptionId: [...claimed][0] ?? '' }))
    .sort((a, b) => a.answer - b.answer);
}

/**
 * Rows of `rowLength`, `rows` of them: the answer is the plants in all (the Tile Farm brief). An
 * equal-groups template names the rows; an array template draws the field's outline. Rows of a
 * times-table length assess its skills too. Undefined if the features make no valid item.
 */
export function fieldItem(
  template: FieldTemplate,
  features: FieldFeatures,
  config: GeneratorConfig,
): Item | undefined {
  const { rows, rowLength, crop } = features;
  if (!template.crops.includes(crop)) return undefined;
  const total = rows * rowLength;
  const { difficulty, timesTables } = template;
  const parsed = NumericItem.safeParse({
    id: fieldItemId(template, features),
    type: 'numeric',
    skillIds: timesTables?.rowLengths.includes(rowLength)
      ? [...new Set([...template.skillIds, ...timesTables.skillIds])]
      : template.skillIds,
    difficulty: Number(
      (
        difficulty.base +
        difficulty.perRow * rows +
        difficulty.perTen * (total / 10) +
        (difficulty.easyLengths.includes(rowLength) ? 0 : difficulty.awkwardLength)
      ).toFixed(config.difficultyDecimals),
    ),
    answer: { kind: 'decimal', value: total },
    tolerance: 0,
    acceptEquivalentFractions: false,
    scene: {
      kind: 'field',
      task: template.generator === 'field-equal-groups' ? 'equal-groups' : 'array',
      rows,
      rowLength,
      crop,
    },
    misconceptions: misconceptionsFor(template, rows, rowLength),
  });
  return parsed.success ? parsed.data : undefined;
}

/** The features an ID names, after the template's own ID and a dash: "3-rows-of-4-carrot". */
export function fieldFeatures(rest: string): FieldFeatures | undefined {
  const match = /^(\d+)-rows-of-(\d+)-([a-z][a-z0-9-]*)$/.exec(rest);
  if (!match) return undefined;
  const [, rows = '', rowLength = '', crop = ''] = match;
  return { rows: Number(rows), rowLength: Number(rowLength), crop };
}
