import { z } from 'zod';
import { Timestamp, Uuidv7 } from './common';

/**
 * How a parent's consent was given (plan 8.4). The mock has one method, a statement the parent
 * ticks (ADR 0046); each market's verifiable method is added before launch.
 */
export const CONSENT_METHODS = ['declaration'] as const;
export const ConsentMethod = z.enum(CONSENT_METHODS);

/**
 * A parent's consent for a family, given before any child data is collected (plan 8.4): who gave
 * it, to which version of the privacy policy, by which method, with what evidence, and when.
 * Consent is never changed: a new version is consented to with a new record.
 */
export const ConsentRecord = z.strictObject({
  id: Uuidv7,
  familyId: Uuidv7,
  accountId: Uuidv7,
  policyVersion: z.string().trim().min(1),
  method: ConsentMethod,
  /** Where the proof is: for a declaration, the screen and statement the parent ticked. */
  evidence: z.string().trim().min(1),
  givenAt: Timestamp,
});

export type ConsentMethod = z.infer<typeof ConsentMethod>;
export type ConsentRecord = z.infer<typeof ConsentRecord>;
