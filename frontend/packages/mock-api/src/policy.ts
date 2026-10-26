import type { FamilyRole } from '@learnofun/contracts';

/** What a family member can ask to do in the parent dashboard. */
export type FamilyAction = 'read-family' | 'manage-children';

/**
 * Who may do what in a family (plan 8.1): owners and guardians manage children; a caregiver can
 * look but only starts child mode. The one place the mock API decides it, as the real API's
 * policy module will (`.claude/rules/api-and-data.md`).
 */
const ALLOWED: Record<FamilyAction, readonly FamilyRole[]> = {
  'read-family': ['owner', 'guardian', 'caregiver'],
  'manage-children': ['owner', 'guardian'],
};

export function mayDo(role: FamilyRole, action: FamilyAction): boolean {
  return ALLOWED[action].includes(role);
}
