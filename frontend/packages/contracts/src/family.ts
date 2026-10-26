import { z } from 'zod';
import { Locale, Market, Timestamp, TimeZone, Uuidv7 } from './common';

/** Owner: billing and deletion. Guardian: full child management. Caregiver: child mode only (plan 8.1). */
export const FAMILY_ROLES = ['owner', 'guardian', 'caregiver'] as const;
export const FamilyRole = z.enum(FAMILY_ROLES);

/**
 * A parent, guardian or caregiver. Only adults have accounts; children never do (plan 8.1).
 * Unknown fields are rejected, so no extra personal data slips in.
 */
export const ParentAccount = z.strictObject({
  id: Uuidv7,
  displayName: z.string().trim().min(1).max(60),
  email: z.email({ error: 'Expected an email address' }),
  uiLocale: Locale,
  createdAt: Timestamp,
});

export const FamilyMember = z.object({
  accountId: Uuidv7,
  role: FamilyRole,
});

/** The tenant that owns a family's personal data (plan 3.1). */
export const Family = z
  .object({
    id: Uuidv7,
    /** Country whose law, prices and defaults apply. */
    market: Market,
    /** Where the family's personal data lives, such as `eu-1`. */
    homeRegion: z.string().regex(/^[a-z]{2}-\d+$/, { error: 'Expected a region such as eu-1' }),
    timeZone: TimeZone,
    members: z.array(FamilyMember).min(1, { error: 'A family needs at least one member' }),
    createdAt: Timestamp,
  })
  .superRefine((family, context) => {
    const owners = family.members.filter((member) => member.role === 'owner').length;
    if (owners !== 1) {
      context.addIssue({
        code: 'custom',
        message: `A family has exactly one owner; this one has ${String(owners)}`,
        path: ['members'],
      });
    }
  });

export type FamilyRole = z.infer<typeof FamilyRole>;
export type ParentAccount = z.infer<typeof ParentAccount>;
export type FamilyMember = z.infer<typeof FamilyMember>;
export type Family = z.infer<typeof Family>;
