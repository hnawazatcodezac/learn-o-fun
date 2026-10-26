import type {
  AudioChoiceItem,
  BuildSpellItem,
  ChoiceItem,
  Instruction,
  Item,
  ItemResponse,
  MatchSortItem,
  NumberValue,
  NumericItem,
  PlacementItem,
  ProgramItem,
  SequenceItem,
} from '@learnofun/contracts';

/** Configuration for the graders: no inline magic numbers in learning-core. */
export interface GraderConfig {
  /** Allowance for floating-point error when comparing numbers. */
  epsilon: number;
  /** A program that would run more steps than this is wrong, so a run always ends (ADR 0030). */
  maxProgramSteps: number;
}

export const DEFAULT_GRADER_CONFIG: GraderConfig = { epsilon: 1e-9, maxProgramSteps: 1000 };

/** The verdict on one answer. The server re-grades every answer with these same graders (plan 5.4). */
export interface GradeResult {
  correct: boolean;
  /** From 0 to 1; between the two only where an item allows partial credit. */
  score: number;
  /** The misconception a wrong answer points to, if the item names one (plan 4.2). */
  misconceptionId?: string;
}

const right: GradeResult = { correct: true, score: 1 };
const wrong: GradeResult = { correct: false, score: 0 };

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  const left = new Set(a);
  const other = new Set(b);
  return left.size === other.size && [...left].every((value) => other.has(value));
}

function gradeChoice(item: ChoiceItem, optionIds: readonly string[]): GradeResult {
  if (sameSet(optionIds, item.correctOptionIds)) return right;
  const misconceptionId = item.options.find(
    (option) => optionIds.includes(option.id) && option.misconceptionId !== undefined,
  )?.misconceptionId;
  return misconceptionId === undefined ? wrong : { ...wrong, misconceptionId };
}

function gradeAudioChoice(item: AudioChoiceItem, optionId: string): GradeResult {
  return optionId === item.correctOptionId ? right : wrong;
}

const valueOf = (number: NumberValue) =>
  number.kind === 'decimal' ? number.value : number.numerator / number.denominator;

function gradeNumeric(item: NumericItem, value: NumberValue, config: GraderConfig): GradeResult {
  const { answer } = item;
  if (answer.kind === 'fraction') {
    // A fraction answer wants a fraction: the same one, or an equivalent one if the item allows.
    if (value.kind !== 'fraction') return wrong;
    const same = value.numerator === answer.numerator && value.denominator === answer.denominator;
    const equivalent =
      value.numerator * answer.denominator === answer.numerator * value.denominator;
    return same || (item.acceptEquivalentFractions && equivalent) ? right : wrong;
  }
  if (Math.abs(valueOf(value) - answer.value) <= item.tolerance + config.epsilon) return right;
  // A wrong number the item links to a misconception lets the explanation target it (plan 4.2).
  const misconceptionId = item.misconceptions?.find(
    (mistake) => Math.abs(valueOf(value) - mistake.answer) <= config.epsilon,
  )?.misconceptionId;
  return misconceptionId === undefined ? wrong : { ...wrong, misconceptionId };
}

function gradePlacement(
  item: PlacementItem,
  at: Extract<ItemResponse, { type: 'placement' }>['at'],
  config: GraderConfig,
): GradeResult {
  const { surface } = item;
  if (surface.kind === 'line') {
    if (at.kind !== 'line') return wrong;
    if (Math.abs(at.position - surface.target) <= surface.tolerance + config.epsilon) return right;
    // A wrong landing the item links to a misconception lets the explanation target it (plan 4.2).
    const misconceptionId = surface.misconceptions.find(
      ({ position }) => Math.abs(at.position - position) <= config.epsilon,
    )?.misconceptionId;
    return misconceptionId === undefined ? wrong : { ...wrong, misconceptionId };
  }
  if (at.kind !== 'grid') return wrong;
  return at.row === surface.target.row && at.column === surface.target.column ? right : wrong;
}

type MatchSortAnswer = Extract<ItemResponse, { type: 'match-sort' }>['answer'];

/**
 * Right when the pairs, or the cards' buckets, are exactly the item's: none missing, none extra.
 * With partial credit the score is the share given right; it never counts towards mastery
 * (ADR 0030).
 */
function gradeMatchSort(item: MatchSortItem, answer: MatchSortAnswer): GradeResult {
  const { task } = item;
  let expected: string[];
  let given: string[];
  if (task.mode === 'match' && answer.mode === 'match') {
    expected = task.pairs.map((pair) => `${pair.leftId}>${pair.rightId}`);
    given = answer.pairs.map((pair) => `${pair.leftId}>${pair.rightId}`);
  } else if (task.mode === 'sort' && answer.mode === 'sort') {
    expected = task.placements.map((p) => `${p.cardId}>${p.bucketId}`);
    given = answer.placements.map((p) => `${p.cardId}>${p.bucketId}`);
  } else {
    return wrong;
  }
  const answered = new Set(given);
  const hits = expected.filter((key) => answered.has(key)).length;
  if (hits === expected.length && given.length === expected.length && answered.size === hits) {
    return right;
  }
  return { correct: false, score: item.partialCredit ? hits / expected.length : 0 };
}

/**
 * Right in exactly the right order. The score is the share of elements in their place, or of
 * neighbouring pairs in order, as the item says; an answer that leaves an element out, or names
 * one twice, scores 0 (ADR 0030).
 */
function gradeSequence(item: SequenceItem, order: readonly string[]): GradeResult {
  const expected = item.correctOrder;
  const complete =
    order.length === expected.length &&
    new Set(order).size === order.length &&
    order.every((id) => expected.includes(id));
  if (!complete) return wrong;
  if (order.every((id, index) => id === expected[index])) return right;
  if (item.scoring === 'positional') {
    const inPlace = order.filter((id, index) => id === expected[index]).length;
    return { correct: false, score: inPlace / expected.length };
  }
  const pairsOf = (list: readonly string[]) =>
    list.slice(1).map((id, index) => `${String(list[index])}>${id}`);
  const neighbours = new Set(pairsOf(expected));
  const kept = pairsOf(order).filter((pair) => neighbours.has(pair));
  return { correct: false, score: kept.length / (expected.length - 1) };
}

/**
 * The tiles' texts, joined in order, must equal an accepted spelling after Unicode
 * normalisation; capitals count. Each tile is used at most once, as a real tile (ADR 0030).
 */
function gradeBuildSpell(item: BuildSpellItem, tileIds: readonly string[]): GradeResult {
  if (new Set(tileIds).size !== tileIds.length) return wrong;
  const texts = tileIds.map((id) => item.tiles.find((tile) => tile.id === id)?.text);
  if (texts.some((text) => text === undefined)) return wrong;
  const word = texts.join('').normalize('NFC');
  return item.accepted.some((spelling) => spelling.normalize('NFC') === word) ? right : wrong;
}

const HEADINGS = ['north', 'east', 'south', 'west'] as const;
type Heading = (typeof HEADINGS)[number];

/** One cell's move for each heading, as columns and rows: north is up a row. */
const MOVES: Record<Heading, readonly [number, number]> = {
  north: [0, -1],
  east: [1, 0],
  south: [0, 1],
  west: [-1, 0],
};

/** Every instruction counts once: a repeat, and each instruction in its body. */
function instructionCount(instructions: readonly Instruction[]): number {
  return instructions.reduce(
    (count, instruction) =>
      count + 1 + (instruction.op === 'repeat' ? instructionCount(instruction.body) : 0),
    0,
  );
}

function usesOnly(instructions: readonly Instruction[], allowed: readonly string[]): boolean {
  return instructions.every(
    (instruction) =>
      allowed.includes(instruction.op) &&
      (instruction.op !== 'repeat' || usesOnly(instruction.body, allowed)),
  );
}

/**
 * Runs the program in the item's world. A move into a wall or off the grid ends the run, wrong;
 * the answer is right only if the robot ends on the goal, using only the allowed commands,
 * within the instruction limit (ADR 0030).
 */
function gradeProgram(
  item: ProgramItem,
  instructions: readonly Instruction[],
  config: GraderConfig,
): GradeResult {
  if (
    !usesOnly(instructions, item.allowedCommands) ||
    instructionCount(instructions) > item.maxInstructions
  ) {
    return wrong;
  }
  const { world } = item;
  const wallAt = (column: number, row: number) =>
    world.walls.some((wall) => wall.column === column && wall.row === row);
  let { column, row } = world.start;
  let heading: Heading = world.start.facing;
  let steps = 0;
  const turn = (by: number) => {
    const index = HEADINGS.indexOf(heading);
    heading = HEADINGS[(index + by + HEADINGS.length) % HEADINGS.length] ?? heading;
  };

  const run = (list: readonly Instruction[]): boolean => {
    for (const instruction of list) {
      steps += 1;
      if (steps > config.maxProgramSteps) return false;
      if (instruction.op === 'forward') {
        const [across, down] = MOVES[heading];
        const nextColumn = column + across;
        const nextRow = row + down;
        const outside =
          nextColumn < 0 || nextRow < 0 || nextColumn >= world.columns || nextRow >= world.rows;
        if (outside || wallAt(nextColumn, nextRow)) return false;
        column = nextColumn;
        row = nextRow;
      } else if (instruction.op === 'turn-left') {
        turn(-1);
      } else if (instruction.op === 'turn-right') {
        turn(1);
      } else {
        for (let time = 0; time < instruction.times; time += 1) {
          if (!run(instruction.body)) return false;
        }
      }
    }
    return true;
  };

  return run(instructions) && column === world.goal.column && row === world.goal.row
    ? right
    : wrong;
}

/** Grades an answer to an item. An answer for a different item type is simply wrong. */
export function grade(
  item: Item,
  response: ItemResponse,
  config: GraderConfig = DEFAULT_GRADER_CONFIG,
): GradeResult {
  switch (item.type) {
    case 'choice':
      return response.type === 'choice' ? gradeChoice(item, response.optionIds) : wrong;
    case 'audio-choice':
      return response.type === 'audio-choice' ? gradeAudioChoice(item, response.optionId) : wrong;
    case 'numeric':
      return response.type === 'numeric' ? gradeNumeric(item, response.value, config) : wrong;
    case 'placement':
      return response.type === 'placement' ? gradePlacement(item, response.at, config) : wrong;
    case 'match-sort':
      return response.type === 'match-sort' ? gradeMatchSort(item, response.answer) : wrong;
    case 'sequence':
      return response.type === 'sequence' ? gradeSequence(item, response.order) : wrong;
    case 'build-spell':
      return response.type === 'build-spell' ? gradeBuildSpell(item, response.tileIds) : wrong;
    case 'program':
      return response.type === 'program'
        ? gradeProgram(item, response.instructions, config)
        : wrong;
  }
}
