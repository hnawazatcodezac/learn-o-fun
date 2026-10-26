import IntlMessageFormat from 'intl-messageformat';
import { describe, expect, it } from 'vitest';
import en from './catalogs/en.json';

function messages(node: unknown, prefix = ''): [string, string][] {
  if (typeof node === 'string') return [[prefix, node]];
  if (typeof node !== 'object' || node === null) throw new Error(`${prefix} is not a message`);
  return Object.entries(node).flatMap(([key, child]) =>
    messages(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('English catalog', () => {
  const entries = messages(en);

  it('has messages', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it.each(entries)('%s is valid ICU MessageFormat', (_key, message) => {
    expect(() => new IntlMessageFormat(message, 'en')).not.toThrow();
  });

  it.each(entries)('%s is not empty', (_key, message) => {
    expect(message.trim()).not.toBe('');
  });

  // Parent-facing copy uses growth language (CLAUDE.md rule 10; design system README): no word
  // that frames a child as lacking, in any of its forms ("weakness", "failed", "slower").
  const parentCopy = entries.filter(([key]) => key.startsWith('parent.'));

  it('has parent-facing messages to check', () => {
    expect(parentCopy.length).toBeGreaterThan(0);
  });

  it.each(parentCopy)('%s uses growth language', (_key, message) => {
    expect(message).not.toMatch(/\b(weak|fail|behind|slow)/i);
  });
});
