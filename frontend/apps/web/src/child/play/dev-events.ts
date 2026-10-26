import type { LearningEvent } from '@learnofun/contracts';

declare global {
  interface Window {
    /**
     * Learning events from /play/dev, in development builds only, for tests and debugging. Real
     * activities send theirs to the API from FRONTEND-KICKOFF step 8.
     */
    learnofunDevEvents?: LearningEvent[];
  }
}

export function recordDevEvents(events: readonly LearningEvent[]) {
  (window.learnofunDevEvents ??= []).push(...events);
}
