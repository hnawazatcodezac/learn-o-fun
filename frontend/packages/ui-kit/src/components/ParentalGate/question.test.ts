import { describe, expect, it } from 'vitest';
import { GATE_FACTORS, isGateAnswer, makeGateQuestion } from './question';

describe('makeGateQuestion', () => {
  it('uses only factors from 3 to 9', () => {
    for (const value of [0, 0.2, 0.5, 0.75, 0.999_999]) {
      const { a, b } = makeGateQuestion(() => value);
      expect(GATE_FACTORS).toContain(a);
      expect(GATE_FACTORS).toContain(b);
    }
  });

  it('spans the whole range of factors', () => {
    expect(makeGateQuestion(() => 0)).toEqual({ a: 3, b: 3 });
    expect(makeGateQuestion(() => 0.999_999)).toEqual({ a: 9, b: 9 });
  });
});

describe('isGateAnswer', () => {
  it('accepts the product only', () => {
    expect(isGateAnswer({ a: 7, b: 6 }, '42')).toBe(true);
    expect(isGateAnswer({ a: 7, b: 6 }, '13')).toBe(false);
    expect(isGateAnswer({ a: 7, b: 6 }, '')).toBe(false);
  });
});
