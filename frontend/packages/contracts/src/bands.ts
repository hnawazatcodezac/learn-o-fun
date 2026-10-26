import { z } from 'zod';

/**
 * Experience bands set reading load, interaction style and session length (plan 3.1, 6.6).
 * Only the bands for ages 3–8 exist so far (ADR 0005).
 */
export const EXPERIENCE_BANDS = ['early-years', 'early-primary'] as const;

export const ExperienceBand = z.enum(EXPERIENCE_BANDS, {
  error: `Expected an experience band: ${EXPERIENCE_BANDS.join(', ')}`,
});

export type ExperienceBand = z.infer<typeof ExperienceBand>;
