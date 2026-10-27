import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn (ADR 0043)', () => {
  it('keeps a type style and a colour, which do not conflict', () => {
    expect(cn('text-play-label', 'text-ink')).toBe('text-play-label text-ink');
  });

  it('lets a later utility win over the one it conflicts with', () => {
    expect(cn('bg-sun', 'bg-sky')).toBe('bg-sky');
    expect(cn('p-5', 'p-3')).toBe('p-3');
    expect(cn('rounded-md', 'rounded-lg')).toBe('rounded-lg');
    expect(cn('text-play-title', 'text-play-label')).toBe('text-play-label');
    expect(cn('shadow-press-depth', 'shadow-focus-ring')).toBe('shadow-focus-ring');
    expect(cn('shadow-press-depth', 'shadow-with-focus-press-depth')).toBe(
      'shadow-with-focus-press-depth',
    );
    expect(cn('block-ui-icon inline-ui-icon', 'block-4 inline-4')).toBe('block-4 inline-4');
  });

  it('keeps conditional classes and the lf- hooks the tests find elements by', () => {
    const tile = (selected: boolean) =>
      cn('lf-answer', selected && 'bg-ui-selected', !selected && 'bg-surface-raised');
    expect(tile(true)).toBe('lf-answer bg-ui-selected');
    expect(tile(false)).toBe('lf-answer bg-surface-raised');
  });
});
