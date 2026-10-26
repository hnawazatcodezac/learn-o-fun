import { describe, expect, it } from 'vitest';
import { createRandom, deriveSeed, nextRandom, seedRandom } from './random';

function draws(seed: number, count: number): number[] {
  const values: number[] = [];
  let state = seedRandom(seed);
  for (let index = 0; index < count; index += 1) {
    const [value, next] = nextRandom(state);
    values.push(value);
    state = next;
  }
  return values;
}

describe('nextRandom', () => {
  it('gives the same numbers for the same seed', () => {
    expect(draws(42, 20)).toEqual(draws(42, 20));
  });

  it('gives different numbers for a different seed', () => {
    expect(draws(42, 20)).not.toEqual(draws(43, 20));
  });

  it('stays in [0, 1)', () => {
    for (const value of draws(7, 10_000)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('spreads its numbers roughly evenly', () => {
    const values = draws(99, 10_000);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(mean).toBeGreaterThan(0.48);
    expect(mean).toBeLessThan(0.52);
  });
});

describe('deriveSeed', () => {
  it('gives a separate, repeatable stream per label', () => {
    expect(deriveSeed(42, 'game')).toBe(deriveSeed(42, 'game'));
    expect(deriveSeed(42, 'game')).not.toBe(deriveSeed(42, 'engine'));
    expect(deriveSeed(42, 'game')).not.toBe(deriveSeed(43, 'game'));
  });
});

describe('createRandom', () => {
  it('draws whole numbers within bounds, both included', () => {
    const random = createRandom(5);
    const seen = new Set<number>();
    for (let index = 0; index < 2000; index += 1) seen.add(random.int(3, 9));
    expect([...seen].sort((a, b) => a - b)).toEqual([3, 4, 5, 6, 7, 8, 9]);
  });

  it('picks items repeatably', () => {
    const items = ['a', 'b', 'c'] as const;
    const first = createRandom(11);
    const second = createRandom(11);
    expect(Array.from({ length: 10 }, () => first.pick(items))).toEqual(
      Array.from({ length: 10 }, () => second.pick(items)),
    );
  });
});
