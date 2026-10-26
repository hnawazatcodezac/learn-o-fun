import { ParentalGate, gateModeForBand, type ExperienceBand } from '@learnofun/ui-kit';
import type { ReactNode } from 'react';

/**
 * The parental gate for the band's configured check (plan 8.1, ADR 0008), before settings and
 * before leaving child mode (CLAUDE.md rule 6).
 */
export function ChildGate({
  band,
  ...gate
}: {
  band: ExperienceBand;
  open: boolean;
  onPass: () => void;
  onCancel: () => void;
}): ReactNode {
  if (gateModeForBand(band) === 'pin') {
    // No band uses the PIN gate yet; it needs the parent's PIN from FRONTEND-KICKOFF step 10.
    throw new Error(`The PIN gate for ${band} needs a parent PIN, which does not exist yet`);
  }
  return <ParentalGate mode="challenge" {...gate} />;
}
