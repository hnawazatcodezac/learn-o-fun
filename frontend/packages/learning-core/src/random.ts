/**
 * A seeded random source (mulberry32): the same seed always gives the same numbers, so any
 * session can be replayed exactly (plan 2.3). Pure: each draw returns the value and the next
 * state, and nothing here reads the clock or `Math.random`.
 */
export type RandomState = number;

export function seedRandom(seed: number): RandomState {
  return seed >>> 0;
}

/** A number in [0, 1), and the state to draw the next one from. */
export function nextRandom(state: RandomState): [value: number, next: RandomState] {
  const next = (state + 0x6d2b79f5) >>> 0;
  let mixed = next;
  mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
  return [((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296, next];
}

/**
 * A separate stream for one use, such as a game's own randomness, so that drawing from it never
 * changes the numbers another use sees from the same seed.
 */
export function deriveSeed(seed: number, label: string): number {
  // FNV-1a over the label, mixed with the seed.
  let hash = 0x811c9dc5 ^ (seed >>> 0);
  for (let index = 0; index < label.length; index += 1) {
    hash ^= label.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** A random source that keeps its own state, for code that draws many numbers, such as a game. */
export interface Random {
  /** A number in [0, 1). */
  next(): number;
  /** A whole number from `min` to `max`, both included. */
  int(min: number, max: number): number;
  /** One of the items. */
  pick<T>(items: readonly [T, ...T[]]): T;
}

export function createRandom(seed: number): Random {
  let state = seedRandom(seed);
  const next = () => {
    const [value, following] = nextRandom(state);
    state = following;
    return value;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)] ?? items[0],
  };
}
