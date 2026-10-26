import { nextRandom, type RandomState } from './random';

const hex = (value: number, digits: number) => value.toString(16).padStart(digits, '0');

/**
 * A UUIDv7 (RFC 9562) made from a time and the seeded random source. Devices create session and
 * event IDs themselves (CLAUDE.md rule 8); making them from the injected clock and seed means a
 * replay produces the very same IDs.
 */
export function uuidv7(timeMs: number, random: RandomState): [id: string, next: RandomState] {
  const bytes: number[] = [];
  let state = random;
  for (let index = 0; index < 10; index += 1) {
    const [value, following] = nextRandom(state);
    bytes.push(Math.floor(value * 256));
    state = following;
  }
  const [b0 = 0, b1 = 0, b2 = 0, ...rest] = bytes;
  const time = hex(Math.floor(timeMs), 12).slice(-12);
  // 12 random bits after the version nibble, then the variant bits 10 and 62 random bits.
  const randomA = hex(((b0 << 8) | b1) & 0x0fff, 3);
  const variant = hex((b2 & 0x3f) | 0x80, 2);
  const randomB = rest.map((byte) => hex(byte, 2)).join('');
  const id = `${time.slice(0, 8)}-${time.slice(8)}-7${randomA}-${variant}${randomB.slice(0, 2)}-${randomB.slice(2)}`;
  return [id, state];
}
