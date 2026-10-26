import { z } from 'zod';
import { Timestamp, Uuidv7 } from './common';
import { Tier } from './activity';

/**
 * What a family's plan grants, by feature key (plan 9). Code checks these keys, never plan
 * names, so pricing and packaging can change without code changes.
 */
export const Features = z.object({
  'children.max': z.int().min(1),
  'activities.tier': Tier,
  'insights.detail': z.enum(['basic', 'full']),
  'digest.weekly': z.boolean(),
  'goals.custom': z.boolean(),
});

/** A family's computed entitlements: its plan plus any overrides. */
export const Entitlements = z.object({
  familyId: Uuidv7,
  features: Features,
  computedAt: Timestamp,
});

export type Features = z.infer<typeof Features>;
export type Entitlements = z.infer<typeof Entitlements>;
