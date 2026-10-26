import { z } from 'zod';
import { checkUnique, ContentId, Locale, LocalizedText } from './common';

/**
 * The shared item types (plan 6.4). Items are not tied to one game, so the same item can appear
 * in several games. Each type has a schema for the item and one for the child's answer; the
 * graders in `learning-core` turn an answer into a verdict.
 */
export const ITEM_TYPES = [
  'choice',
  'numeric',
  'placement',
  'match-sort',
  'sequence',
  'build-spell',
  'audio-choice',
  'program',
] as const;
export const ItemTypeId = z.enum(ITEM_TYPES);

/** A common wrong answer that the explanation can target (plan 4.2). */
export const Misconception = z.object({
  id: ContentId,
  skillId: ContentId,
  title: LocalizedText,
  explanation: LocalizedText,
});

const itemBase = {
  id: ContentId,
  /** The skills this item gives evidence for. */
  skillIds: z.array(ContentId).min(1, { error: 'An item assesses at least one skill' }),
  /** Difficulty b on the ability scale (plan 4.1). */
  difficulty: z.number(),
  /** Instructions, when the item has its own wording rather than the game's. */
  prompt: LocalizedText.optional(),
};

const partFields = {
  id: ContentId,
  label: LocalizedText.optional(),
  /** An image asset, for pre-readers. */
  image: ContentId.optional(),
};

const hasLabelOrImage = (part: { label?: unknown; image?: unknown }) =>
  part.label !== undefined || part.image !== undefined;

/** A labelled piece of an item: an option, card or sequence element. */
const Part = z.object(partFields).refine(hasLabelOrImage, {
  error: 'Give a label, an image or both',
});

/** Adds an issue for every ID in `ids` that is not in `known`. */
function checkKnown(
  ids: readonly string[],
  known: ReadonlySet<string>,
  context: z.core.$RefinementCtx,
  path: (string | number)[],
  kind: string,
) {
  ids.forEach((id, index) => {
    if (!known.has(id)) {
      context.addIssue({
        code: 'custom',
        message: `Unknown ${kind} ${id}`,
        path: [...path, index],
      });
    }
  });
}

const idsOf = (parts: readonly { id: string }[]) => new Set(parts.map((part) => part.id));

// 1. choice: single or multiple choice; wrong options may carry misconception codes.

const ChoiceOption = z
  .object({ ...partFields, misconceptionId: ContentId.optional() })
  .refine(hasLabelOrImage, { error: 'Give a label, an image or both' });

export const ChoiceItem = z
  .object({
    ...itemBase,
    type: z.literal('choice'),
    options: z.array(ChoiceOption).min(2, { error: 'A choice item needs at least two options' }),
    correctOptionIds: z.array(ContentId).min(1),
    multiple: z.boolean(),
  })
  .superRefine((item, context) => {
    checkUnique(item.options, context, (option) => `Option ${option.id}`, ['options']);
    checkKnown(item.correctOptionIds, idsOf(item.options), context, ['correctOptionIds'], 'option');
    if (!item.multiple && item.correctOptionIds.length !== 1) {
      context.addIssue({
        code: 'custom',
        message: 'A single-choice item has exactly one correct option',
        path: ['correctOptionIds'],
      });
    }
    item.options.forEach((option, index) => {
      if (option.misconceptionId && item.correctOptionIds.includes(option.id)) {
        context.addIssue({
          code: 'custom',
          message: 'Only wrong options carry a misconception',
          path: ['options', index, 'misconceptionId'],
        });
      }
    });
  });

export const ChoiceResponse = z.object({
  type: z.literal('choice'),
  optionIds: z.array(ContentId).min(1),
});

// 2. numeric: a number, with tolerance and accepted forms such as equivalent fractions.

export const NumberValue = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('decimal'), value: z.number() }),
  z.object({
    kind: z.literal('fraction'),
    numerator: z.int(),
    denominator: z.int().positive({ error: 'A denominator must be positive' }),
  }),
]);

/** A wrong answer that points to a misconception, so the explanation can target it (plan 4.2). */
const AnswerMisconception = z.object({ answer: z.number(), misconceptionId: ContentId });

/** What the child does with the trays (the Ten Frame Café brief, ADR 0037). */
export const TEN_FRAME_TASKS = ['fill-to', 'fill-up', 'make-ten'] as const;

/**
 * A ten-frame scene (ADR 0037): one or two trays of ten, in two rows of five, with the fruit
 * already in them. In `fill-to` the trays start empty and the answer is how many the child puts
 * in. In `fill-up` one tray is part full and the answer is how many fill it. In `make-ten` two
 * trays hold the parts of a sum; the child fills the first from the second, and the answer is the
 * total.
 */
export const TenFrameScene = z.object({
  kind: z.literal('ten-frame'),
  task: z.enum(TEN_FRAME_TASKS),
  /** The fruit in each tray before the child starts. */
  trays: z.array(z.int().min(0).max(10)).min(1).max(2),
  /** The fruit, which the game names and draws. */
  fruit: ContentId,
});

/** What the farmer asks for (the Tile Farm brief, ADR 0038). */
export const FIELD_TASKS = ['equal-groups', 'array'] as const;

/**
 * A field scene (ADR 0038): rows of crops, every row the same length. In `equal-groups` the farmer
 * names the rows and their length; in `array` the field's outline is drawn, rows by columns.
 * Either way the child plants the rows, then counts the plants: the answer is rows × length.
 */
export const FieldScene = z.object({
  kind: z.literal('field'),
  task: z.enum(FIELD_TASKS),
  rows: z.int().min(1).max(10),
  rowLength: z.int().min(1).max(10),
  /** The crop, which the game names and draws. */
  crop: ContentId,
});

type Issues = {
  addIssue: (issue: { code: 'custom'; message: string; path: PropertyKey[] }) => void;
};

/** Checks that a ten-frame scene and its item's answer agree (ADR 0037). */
function checkTenFrame(scene: z.infer<typeof TenFrameScene>, whole: number, context: Issues) {
  const issue = (path: PropertyKey[], message: string) => {
    context.addIssue({ code: 'custom', message, path });
  };
  const [first = 0, second] = scene.trays;
  if (scene.task === 'fill-to') {
    if (scene.trays.some((fruit) => fruit !== 0))
      issue(['scene', 'trays'], 'The trays start empty');
    if (whole < 1 || whole > 10 * scene.trays.length) {
      issue(['answer'], 'The answer must fit in the trays');
    }
  } else if (scene.task === 'fill-up') {
    if (scene.trays.length !== 1 || first >= 10) {
      issue(['scene', 'trays'], 'One tray, not yet full');
    } else if (whole !== 10 - first) {
      issue(['answer'], 'The answer is what fills the tray');
    }
  } else if (second === undefined || first < 1 || first >= 10 || second < 1) {
    issue(['scene', 'trays'], 'Two trays with fruit, the first not yet full');
  } else if (first + second <= 10) {
    issue(['scene', 'trays'], 'The parts make more than ten');
  } else if (whole !== first + second) {
    issue(['answer'], 'The answer is the total');
  }
}

export const NumericItem = z
  .object({
    ...itemBase,
    type: z.literal('numeric'),
    answer: NumberValue,
    tolerance: z.number().min(0).default(0),
    /** Accept 2/4 for 1/2, and so on. */
    acceptEquivalentFractions: z.boolean().default(false),
    /** What the game shows, for an item with a scene of its own (ADR 0037). */
    scene: z.discriminatedUnion('kind', [TenFrameScene, FieldScene]).optional(),
    /**
     * Wrong answers that point to a misconception (plan 4.2), none if absent. They never change
     * the grade.
     */
    misconceptions: z.array(AnswerMisconception).optional(),
  })
  .superRefine((item, context) => {
    const whole = item.answer.kind === 'decimal' ? item.answer.value : undefined;
    const seen = new Set<number>();
    (item.misconceptions ?? []).forEach(({ answer }, index) => {
      const path = ['misconceptions', index, 'answer'];
      if (whole !== undefined && Math.abs(answer - whole) <= item.tolerance) {
        context.addIssue({
          code: 'custom',
          message: 'A right answer is not a misconception',
          path,
        });
      } else if (seen.has(answer)) {
        context.addIssue({
          code: 'custom',
          message: 'Each answer points to one misconception',
          path,
        });
      }
      seen.add(answer);
    });
    const { scene } = item;
    if (!scene) return;
    if (whole === undefined || !Number.isInteger(whole)) {
      context.addIssue({
        code: 'custom',
        message: `A ${scene.kind === 'ten-frame' ? 'ten-frame' : 'field'} answer is a whole number`,
        path: ['answer'],
      });
      return;
    }
    if (scene.kind === 'ten-frame') {
      checkTenFrame(scene, whole, context);
    } else if (whole !== scene.rows * scene.rowLength) {
      context.addIssue({
        code: 'custom',
        message: 'The answer is the rows times their length',
        path: ['answer'],
      });
    }
  });

export const NumericResponse = z.object({
  type: z.literal('numeric'),
  value: NumberValue,
});

// 3. placement: a position on a line or grid; tolerance narrows as difficulty rises.

/** A wrong position on a line that points to a misconception, so the explanation can target it. */
const PositionMisconception = z.object({ position: z.number(), misconceptionId: ContentId });

const LinePlacement = z
  .object({
    kind: z.literal('line'),
    min: z.number(),
    max: z.number(),
    target: z.number(),
    tolerance: z.number().min(0),
    /** Where the movement starts, such as the first number of a sum (ADR 0015). */
    start: z.number().optional(),
    /**
     * Label every n-th number from `min`. 1 labels them all; a larger gap leaves landmarks only,
     * so the child counts the marks between them.
     */
    labelEvery: z.int().min(1).default(1),
    /** Wrong positions that point to a misconception (plan 4.2). They never change the grade. */
    misconceptions: z.array(PositionMisconception).default([]),
  })
  .superRefine((line, context) => {
    const onLine = (value: number) => value >= line.min && value <= line.max;
    if (line.max <= line.min) {
      context.addIssue({ code: 'custom', message: 'max must be above min', path: ['max'] });
    }
    if (!onLine(line.target)) {
      context.addIssue({ code: 'custom', message: 'The target is off the line', path: ['target'] });
    }
    if (line.start !== undefined && !onLine(line.start)) {
      context.addIssue({ code: 'custom', message: 'The start is off the line', path: ['start'] });
    }
    const seen = new Set<number>();
    line.misconceptions.forEach(({ position }, index) => {
      const path = ['misconceptions', index, 'position'];
      if (!onLine(position)) {
        context.addIssue({ code: 'custom', message: 'The position is off the line', path });
      } else if (Math.abs(position - line.target) <= line.tolerance) {
        context.addIssue({
          code: 'custom',
          message: 'A right answer is not a misconception',
          path,
        });
      } else if (seen.has(position)) {
        context.addIssue({
          code: 'custom',
          message: 'Each position points to one misconception',
          path,
        });
      }
      seen.add(position);
    });
  });

const GridPlacement = z
  .object({
    kind: z.literal('grid'),
    rows: z.int().min(1),
    columns: z.int().min(1),
    target: z.object({ row: z.int().min(0), column: z.int().min(0) }),
  })
  .superRefine((grid, context) => {
    if (grid.target.row >= grid.rows || grid.target.column >= grid.columns) {
      context.addIssue({ code: 'custom', message: 'The target is off the grid', path: ['target'] });
    }
  });

export const PlacementItem = z.object({
  ...itemBase,
  type: z.literal('placement'),
  surface: z.discriminatedUnion('kind', [LinePlacement, GridPlacement]),
});

export const PlacementResponse = z.object({
  type: z.literal('placement'),
  at: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('line'), position: z.number() }),
    z.object({ kind: z.literal('grid'), row: z.int().min(0), column: z.int().min(0) }),
  ]),
});

// 4. match-sort: pairs or buckets; partial credit is configurable.

const MatchTask = z
  .object({
    mode: z.literal('match'),
    left: z.array(Part).min(2),
    right: z.array(Part).min(2),
    pairs: z.array(z.object({ leftId: ContentId, rightId: ContentId })).min(1),
  })
  .superRefine((task, context) => {
    checkKnown(
      task.pairs.map((pair) => pair.leftId),
      idsOf(task.left),
      context,
      ['pairs'],
      'left card',
    );
    checkKnown(
      task.pairs.map((pair) => pair.rightId),
      idsOf(task.right),
      context,
      ['pairs'],
      'right card',
    );
    checkUnique(task.pairs, context, (pair) => `Left card ${pair.leftId}`, ['pairs']);
  });

const SortTask = z
  .object({
    mode: z.literal('sort'),
    cards: z.array(Part).min(2),
    buckets: z.array(Part).min(2),
    placements: z.array(z.object({ cardId: ContentId, bucketId: ContentId })).min(1),
  })
  .superRefine((task, context) => {
    checkKnown(
      task.placements.map((p) => p.cardId),
      idsOf(task.cards),
      context,
      ['placements'],
      'card',
    );
    checkKnown(
      task.placements.map((p) => p.bucketId),
      idsOf(task.buckets),
      context,
      ['placements'],
      'bucket',
    );
    checkUnique(task.placements, context, (placement) => `Card ${placement.cardId}`, [
      'placements',
    ]);
  });

export const MatchSortItem = z.object({
  ...itemBase,
  type: z.literal('match-sort'),
  task: z.discriminatedUnion('mode', [MatchTask, SortTask]),
  /** Give credit for each correct pair or placement, not only for all of them. */
  partialCredit: z.boolean(),
});

export const MatchSortResponse = z.object({
  type: z.literal('match-sort'),
  answer: z.discriminatedUnion('mode', [
    z.object({
      mode: z.literal('match'),
      pairs: z.array(z.object({ leftId: ContentId, rightId: ContentId })),
    }),
    z.object({
      mode: z.literal('sort'),
      placements: z.array(z.object({ cardId: ContentId, bucketId: ContentId })),
    }),
  ]),
});

// 5. sequence: an ordered list, scored by position or by neighbours.

export const SequenceItem = z
  .object({
    ...itemBase,
    type: z.literal('sequence'),
    elements: z.array(Part).min(2),
    correctOrder: z.array(ContentId).min(2),
    scoring: z.enum(['positional', 'adjacency']),
  })
  .superRefine((item, context) => {
    checkUnique(item.elements, context, (element) => `Element ${element.id}`, ['elements']);
    const known = idsOf(item.elements);
    const order = new Set(item.correctOrder);
    if (
      order.size !== item.correctOrder.length ||
      order.size !== known.size ||
      ![...known].every((id) => order.has(id))
    ) {
      context.addIssue({
        code: 'custom',
        message: 'correctOrder must list every element exactly once',
        path: ['correctOrder'],
      });
    }
  });

export const SequenceResponse = z.object({
  type: z.literal('sequence'),
  order: z.array(ContentId).min(1),
});

// 6. build-spell: tokens; locale-aware word lists, so en-GB and en-US spellings both count.

export const BuildSpellItem = z
  .object({
    ...itemBase,
    type: z.literal('build-spell'),
    tiles: z.array(z.object({ id: ContentId, text: z.string().min(1) })).min(1),
    /** Spellings accepted in the item's locale, such as both `colour` and `color` where both are taught. */
    accepted: z.array(z.string().min(1)).min(1),
    locale: Locale,
  })
  .superRefine((item, context) => {
    checkUnique(item.tiles, context, (tile) => `Tile ${tile.id}`, ['tiles']);
  });

export const BuildSpellResponse = z.object({
  type: z.literal('build-spell'),
  tileIds: z.array(ContentId).min(1),
});

// 7. audio-choice: for pre-readers; the prompt is spoken.

export const AudioChoiceItem = z
  .object({
    ...itemBase,
    type: z.literal('audio-choice'),
    /** The spoken prompt, an audio asset. */
    promptAudio: ContentId,
    options: z
      .array(
        z
          .object({ ...partFields, audio: ContentId.optional() })
          .refine((option) => hasLabelOrImage(option) || option.audio !== undefined, {
            error: 'Give a label, an image or audio',
          }),
      )
      .min(2),
    correctOptionId: ContentId,
  })
  .superRefine((item, context) => {
    checkUnique(item.options, context, (option) => `Option ${option.id}`, ['options']);
    if (!idsOf(item.options).has(item.correctOptionId)) {
      context.addIssue({
        code: 'custom',
        message: `Unknown option ${item.correctOptionId}`,
        path: ['correctOptionId'],
      });
    }
  });

export const AudioChoiceResponse = z.object({
  type: z.literal('audio-choice'),
  optionId: ContentId,
});

// 8. program: an instruction list, graded by running it in a small simulator. A program is data,
// never code, so it can be re-run safely anywhere.

export const COMMANDS = ['forward', 'turn-left', 'turn-right', 'repeat'] as const;
export const Command = z.enum(COMMANDS);

export type Instruction =
  | { op: 'forward' }
  | { op: 'turn-left' }
  | { op: 'turn-right' }
  | { op: 'repeat'; times: number; body: Instruction[] };

export const Instruction: z.ZodType<Instruction> = z.lazy(() =>
  z.discriminatedUnion('op', [
    z.object({ op: z.literal('forward') }),
    z.object({ op: z.literal('turn-left') }),
    z.object({ op: z.literal('turn-right') }),
    z.object({
      op: z.literal('repeat'),
      times: z.int().min(2).max(10),
      body: z.array(Instruction).min(1),
    }),
  ]),
);

const Cell = z.object({ column: z.int().min(0), row: z.int().min(0) });

export const ProgramItem = z
  .object({
    ...itemBase,
    type: z.literal('program'),
    world: z.object({
      columns: z.int().min(1).max(12),
      rows: z.int().min(1).max(12),
      start: z.object({ ...Cell.shape, facing: z.enum(['north', 'east', 'south', 'west']) }),
      goal: Cell,
      walls: z.array(Cell),
    }),
    allowedCommands: z.array(Command).min(1),
    maxInstructions: z.int().min(1).max(50),
  })
  .superRefine((item, context) => {
    const { columns, rows, start, goal, walls } = item.world;
    const cells: [string, { column: number; row: number }][] = [
      ['start', start],
      ['goal', goal],
      ...walls.map((wall, index): [string, typeof wall] => [`walls.${String(index)}`, wall]),
    ];
    for (const [name, cell] of cells) {
      if (cell.column >= columns || cell.row >= rows) {
        context.addIssue({
          code: 'custom',
          message: `${name} is outside the world`,
          path: ['world', ...name.split('.')],
        });
      }
    }
  });

export const ProgramResponse = z.object({
  type: z.literal('program'),
  instructions: z.array(Instruction).min(1),
});

/** Any item. */
export const Item = z.discriminatedUnion('type', [
  ChoiceItem,
  NumericItem,
  PlacementItem,
  MatchSortItem,
  SequenceItem,
  BuildSpellItem,
  AudioChoiceItem,
  ProgramItem,
]);

/** Any answer, tagged with the item type it answers. */
export const ItemResponse = z.discriminatedUnion('type', [
  ChoiceResponse,
  NumericResponse,
  PlacementResponse,
  MatchSortResponse,
  SequenceResponse,
  BuildSpellResponse,
  AudioChoiceResponse,
  ProgramResponse,
]);

export type ItemTypeId = z.infer<typeof ItemTypeId>;
export type Misconception = z.infer<typeof Misconception>;
export type NumberValue = z.infer<typeof NumberValue>;
export type Command = z.infer<typeof Command>;
export type ChoiceItem = z.infer<typeof ChoiceItem>;
export type NumericItem = z.infer<typeof NumericItem>;
export type TenFrameScene = z.infer<typeof TenFrameScene>;
export type TenFrameTask = (typeof TEN_FRAME_TASKS)[number];
export type FieldScene = z.infer<typeof FieldScene>;
export type FieldTask = (typeof FIELD_TASKS)[number];
export type PlacementItem = z.infer<typeof PlacementItem>;
export type MatchSortItem = z.infer<typeof MatchSortItem>;
export type SequenceItem = z.infer<typeof SequenceItem>;
export type BuildSpellItem = z.infer<typeof BuildSpellItem>;
export type AudioChoiceItem = z.infer<typeof AudioChoiceItem>;
export type ProgramItem = z.infer<typeof ProgramItem>;
export type Item = z.infer<typeof Item>;
export type ItemResponse = z.infer<typeof ItemResponse>;
