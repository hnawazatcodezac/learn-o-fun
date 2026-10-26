import { Uuidv7 } from '@learnofun/contracts';
import { describe, expect, it } from 'vitest';
import { uuidv7 } from './ids';
import { seedRandom } from './random';

const NOW = Date.UTC(2026, 9, 20, 9, 15);

describe('uuidv7', () => {
  it('makes IDs the contracts accept as UUIDv7', () => {
    let state = seedRandom(1);
    for (let index = 0; index < 500; index += 1) {
      const [id, next] = uuidv7(NOW + index, state);
      expect(Uuidv7.safeParse(id).success).toBe(true);
      state = next;
    }
  });

  it('carries the time in its first 48 bits, so IDs sort by time', () => {
    const [id] = uuidv7(NOW, seedRandom(1));
    expect(Number.parseInt(id.replace('-', '').slice(0, 12), 16)).toBe(NOW);

    const [later] = uuidv7(NOW + 1, seedRandom(1));
    expect(later > id).toBe(true);
  });

  it('is repeatable for the same time and seed, and differs for another seed', () => {
    expect(uuidv7(NOW, seedRandom(1))).toEqual(uuidv7(NOW, seedRandom(1)));
    expect(uuidv7(NOW, seedRandom(1))[0]).not.toBe(uuidv7(NOW, seedRandom(2))[0]);
  });

  it('never repeats within one stream', () => {
    const ids = new Set<string>();
    let state = seedRandom(3);
    for (let index = 0; index < 5000; index += 1) {
      const [id, next] = uuidv7(NOW, state);
      ids.add(id);
      state = next;
    }
    expect(ids.size).toBe(5000);
  });
});
