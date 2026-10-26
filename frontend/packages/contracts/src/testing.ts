import type { z } from 'zod';

/** A problem Zod found: where, and what it said. */
export interface Problem {
  path: string;
  message: string;
}

/** The problems a schema finds in a value, for readable test assertions. Empty if it is valid. */
export function problems(schema: z.ZodType, value: unknown): Problem[] {
  const result = schema.safeParse(value);
  if (result.success) return [];
  return result.error.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
  }));
}

/** A valid UUIDv7, distinct for each number. */
export function uuid(n: number): string {
  return `0192f4c1-7a2b-7c3d-8e4f-${n.toString(16).padStart(12, '0')}`;
}

export const AT = '2026-10-20T09:15:00.000Z';
export const LATER = '2026-10-20T09:30:00.000Z';
