import { z } from 'zod';
import { checkUnique, ContentId } from './common';

/**
 * One difficulty level of the number-line addition template: the features an item at this level
 * has (plan 6.5). The generator draws a sum `start + hops` that fits all of them.
 */
export const NumberLineAdditionLevel = z
  .object({
    minSum: z.int().min(1),
    maxSum: z.int().min(1),
    /** How many hops: the second number of the sum. */
    minHops: z.int().min(1),
    maxHops: z.int().min(1),
    /** Whether the hops go past 10, such as 8 + 5. */
    crossesTen: z.enum(['always', 'never', 'either']),
    /** Label every n-th number on the line; 1 labels them all. */
    labelEvery: z.int().min(1),
  })
  .superRefine((level, context) => {
    if (level.minSum > level.maxSum) {
      context.addIssue({ code: 'custom', message: 'minSum is above maxSum', path: ['minSum'] });
    }
    if (level.minHops > level.maxHops) {
      context.addIssue({ code: 'custom', message: 'minHops is above maxHops', path: ['minHops'] });
    }
  });

/**
 * Turns an item's features into its difficulty b (plan 4.1): the base, plus each feature the item
 * has. Difficulty comes from the item, not the level, so the same item always has the same value.
 */
export const NumberLineAdditionDifficulty = z.object({
  base: z.number(),
  /** Added when the sum is above 10. */
  sumAboveTen: z.number(),
  /** Added when there are at least `largeHopsFrom` hops. */
  largeHops: z.number(),
  largeHopsFrom: z.int().min(2),
  /** Added when the hops go past 10. */
  crossesTen: z.number(),
  /** Added when only landmarks are labelled. */
  landmarksOnly: z.number(),
});

/** Adding on a number line, as in Hop Line: start on one number and hop forward (ADR 0015). */
export const NumberLineAdditionTemplate = z
  .object({
    id: ContentId,
    generator: z.literal('number-line-addition'),
    line: z.object({ min: z.int(), max: z.int() }),
    /** The skills every item assesses. */
    skillIds: z.array(ContentId).min(1),
    /** The skills an item whose sum is 10 or less assesses instead. */
    skillIdsWithinTen: z.array(ContentId).min(1),
    difficulty: NumberLineAdditionDifficulty,
    /** The misconception each kind of wrong landing points to (the Hop Line brief). */
    misconceptions: z.object({
      /** One short: the starting number was counted as the first hop. */
      countsTheStart: ContentId,
      /** One past: one hop too many. */
      extraHop: ContentId,
      /** On the second number itself, instead of that many hops on. */
      goesToTheNumber: ContentId,
      /** Anywhere below the start. */
      hopsBackwards: ContentId,
    }),
    /** From easiest to hardest. */
    levels: z.array(NumberLineAdditionLevel).min(1),
  })
  .superRefine((template, context) => {
    if (template.line.max <= template.line.min) {
      context.addIssue({ code: 'custom', message: 'max must be above min', path: ['line', 'max'] });
    }
    template.levels.forEach((level, index) => {
      if (level.maxSum > template.line.max) {
        context.addIssue({
          code: 'custom',
          message: 'The largest sum is off the line',
          path: ['levels', index, 'maxSum'],
        });
      }
    });
  });

/** A range with its ends the right way round, for a template level. */
function range(min: string, max: string) {
  return (level: Record<string, unknown>, context: z.core.$RefinementCtx) => {
    const low = level[min];
    const high = level[max];
    if (typeof low === 'number' && typeof high === 'number' && low > high) {
      context.addIssue({ code: 'custom', message: `${min} is above ${max}`, path: [min] });
    }
  };
}

/** One level of the ten-frame counting template: how many the order asks for. */
export const TenFrameCountingLevel = z
  .object({ min: z.int().min(1).max(20), max: z.int().min(1).max(20) })
  .superRefine(range('min', 'max'));

/**
 * Counting into ten frames, as in Ten Frame Café: fill the trays to the number the customer asks
 * for (ADR 0037). Numbers above 10 use a second tray.
 */
export const TenFrameCountingTemplate = z.object({
  id: ContentId,
  generator: z.literal('ten-frame-fill-to'),
  skillIds: z.array(ContentId).min(1),
  /** The fruit an item may use, drawn from its seed. */
  fruits: z.array(ContentId).min(1),
  /** The base, plus `perFruit` for each fruit asked for, plus `aboveTen` when it needs the second tray. */
  difficulty: z.object({ base: z.number(), perFruit: z.number(), aboveTen: z.number() }),
  misconceptions: z.object({
    /** One more or one fewer: a fruit counted twice, or one skipped. */
    countsOneTwice: ContentId,
  }),
  levels: z.array(TenFrameCountingLevel).min(1),
});

/** One level of the bonds-to-10 template: how many are already in the tray. */
export const TenFrameBondsLevel = z
  .object({ minShown: z.int().min(1).max(9), maxShown: z.int().min(1).max(9) })
  .superRefine(range('minShown', 'maxShown'));

/** Number bonds to 10 in a ten frame: a tray part full, and how many fill it (ADR 0037). */
export const TenFrameBondsTemplate = z.object({
  id: ContentId,
  generator: z.literal('ten-frame-fill-up'),
  skillIds: z.array(ContentId).min(1),
  fruits: z.array(ContentId).min(1),
  /**
   * The base, plus `perMissing` for each fruit missing, plus `largeMissing` when at least
   * `largeMissingFrom` are missing.
   */
  difficulty: z.object({
    base: z.number(),
    perMissing: z.number(),
    largeMissing: z.number(),
    largeMissingFrom: z.int().min(2).max(9),
  }),
  misconceptions: z.object({
    /** The number already in the tray, instead of the number missing. */
    givesThePart: ContentId,
    /** The whole tray, 10, instead of the fruit added. */
    countsAll: ContentId,
  }),
  levels: z.array(TenFrameBondsLevel).min(1),
});

/** One level of the making-ten template: the two parts of the sum. */
export const TenFrameMakeTenLevel = z
  .object({
    minFirst: z.int().min(1).max(9),
    maxFirst: z.int().min(1).max(9),
    minSecond: z.int().min(1).max(9),
    maxSecond: z.int().min(1).max(9),
  })
  .superRefine((level, context) => {
    range('minFirst', 'maxFirst')(level, context);
    range('minSecond', 'maxSecond')(level, context);
    if (level.maxFirst + level.maxSecond <= 10) {
      context.addIssue({
        code: 'custom',
        message: 'No two parts make more than ten',
        path: ['maxSecond'],
      });
    }
  });

/**
 * Making ten to add, in two ten frames: fill the first tray from the second, then say the total,
 * as 8 + 5 = 8 + 2 + 3 (ADR 0037).
 */
export const TenFrameMakeTenTemplate = z.object({
  id: ContentId,
  generator: z.literal('ten-frame-make-ten'),
  skillIds: z.array(ContentId).min(1),
  fruits: z.array(ContentId).min(1),
  /**
   * The base, plus `farFromTen` when the first part needs at least `farFrom` to reach ten, and
   * `aboveFifteen` when the total is above 15.
   */
  difficulty: z.object({
    base: z.number(),
    farFromTen: z.number(),
    farFrom: z.int().min(2).max(9),
    aboveFifteen: z.number(),
  }),
  misconceptions: z.object({
    /** 10: the full tray, forgetting what is left in the second. */
    stopsAtTen: ContentId,
    /** The total plus the fruit moved: counted in both trays. */
    countsMovedTwice: ContentId,
  }),
  levels: z.array(TenFrameMakeTenLevel).min(1),
});

/** One level of a field template: how many rows, and which row lengths (ADR 0038). */
export const FieldLevel = z
  .object({
    minRows: z.int().min(1).max(10),
    maxRows: z.int().min(1).max(10),
    /** Rows of 2, 5 and 10 are easier than rows of 3 and 4 (the Tile Farm brief). */
    rowLengths: z.array(z.int().min(1).max(10)).min(1),
  })
  .superRefine((level, context) => {
    range('minRows', 'maxRows')(level, context);
    checkUnique(level.rowLengths, context, (length) => `Row length ${String(length)}`, [
      'rowLengths',
    ]);
  });

/**
 * The skills an item also assesses when its rows hold one of `rowLengths`: in arrays, rows of 2,
 * 5 and 10 are the 2, 5 and 10 times tables (the Tile Farm brief, ADR 0038).
 */
export const FieldTimesTables = z
  .object({
    rowLengths: z.array(z.int().min(1).max(10)).min(1),
    skillIds: z.array(ContentId).min(1),
  })
  .superRefine((tables, context) => {
    checkUnique(tables.rowLengths, context, (length) => `Row length ${String(length)}`, [
      'rowLengths',
    ]);
  });

/** The fields' template fields: both of Tile Farm's activities have the same shape. */
const fieldTemplate = {
  id: ContentId,
  skillIds: z.array(ContentId).min(1),
  timesTables: FieldTimesTables.optional(),
  /** The crops an item may use, drawn from its seed. */
  crops: z.array(ContentId).min(1),
  /**
   * The base, plus `perRow` for each row, `perTen` for each ten plants, and `awkwardLength` when
   * the row length is not one of the `easyLengths`, such as 2, 5 and 10 (the Tile Farm brief).
   */
  difficulty: z.object({
    base: z.number(),
    perRow: z.number(),
    perTen: z.number(),
    awkwardLength: z.number(),
    easyLengths: z.array(z.int().min(1).max(10)),
  }),
  misconceptions: z.object({
    /** The rows and their length added, 3 + 4, instead of the plants counted. */
    addsTheNumbers: ContentId,
    /** One row's plants, 4. */
    countsOneRow: ContentId,
    /** The number of rows, 3. */
    countsTheRows: ContentId,
    /** A row short or a row extra, 8 or 16. */
    skipsARow: ContentId,
  }),
  levels: z.array(FieldLevel).min(1),
};

/** Equal groups in a field, as in Tile Farm: plant the rows named, then count (ADR 0038). */
export const FieldEqualGroupsTemplate = z.object({
  ...fieldTemplate,
  generator: z.literal('field-equal-groups'),
});

/** Arrays in a field: fill the outline, rows by columns, then count (ADR 0038). */
export const FieldArrayTemplate = z.object({
  ...fieldTemplate,
  generator: z.literal('field-array'),
});

/**
 * A parametric item template (plan 6.5): content data that a generator in learning-core turns
 * into fresh items, each rebuilt exactly from its seed. Templates are independent of games, so
 * any game that renders the item type can use them (plan 6.4).
 */
export const ItemTemplate = z.discriminatedUnion('generator', [
  NumberLineAdditionTemplate,
  TenFrameCountingTemplate,
  TenFrameBondsTemplate,
  TenFrameMakeTenTemplate,
  FieldEqualGroupsTemplate,
  FieldArrayTemplate,
]);

/** Checks that a list of templates has distinct IDs. */
export const ItemTemplates = z.array(ItemTemplate).superRefine((templates, context) => {
  checkUnique(templates, context, (template) => `Item template ${template.id}`);
});

export type NumberLineAdditionLevel = z.infer<typeof NumberLineAdditionLevel>;
export type NumberLineAdditionTemplate = z.infer<typeof NumberLineAdditionTemplate>;
export type TenFrameCountingLevel = z.infer<typeof TenFrameCountingLevel>;
export type TenFrameCountingTemplate = z.infer<typeof TenFrameCountingTemplate>;
export type TenFrameBondsLevel = z.infer<typeof TenFrameBondsLevel>;
export type TenFrameBondsTemplate = z.infer<typeof TenFrameBondsTemplate>;
export type TenFrameMakeTenLevel = z.infer<typeof TenFrameMakeTenLevel>;
export type TenFrameMakeTenTemplate = z.infer<typeof TenFrameMakeTenTemplate>;
export type FieldLevel = z.infer<typeof FieldLevel>;
export type FieldTimesTables = z.infer<typeof FieldTimesTables>;
export type FieldEqualGroupsTemplate = z.infer<typeof FieldEqualGroupsTemplate>;
export type FieldArrayTemplate = z.infer<typeof FieldArrayTemplate>;
export type FieldTemplate = FieldEqualGroupsTemplate | FieldArrayTemplate;
export type ItemTemplate = z.infer<typeof ItemTemplate>;
