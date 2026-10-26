import type { ChildSnapshot } from '@learnofun/contracts';
import type { ReactNode } from 'react';
import { LoadState } from '../shared/LoadState';
import { Navigate } from '../shared/navigation';
import { useChildMode } from './child-mode';
import { ChildScreen } from './ChildScreen';
import { DEFAULT_BAND } from './config';

/**
 * Shows its page only once a child is playing: with nobody chosen, back to the profile picker;
 * while the child's snapshot loads, or if it cannot, the usual loading and error states.
 */
export function RequireChild({ children }: { children: (snapshot: ChildSnapshot) => ReactNode }) {
  const { childId, snapshot } = useChildMode();
  if (childId === undefined) return <Navigate to="/" />;
  if (snapshot.status === 'ready' && snapshot.data) return children(snapshot.data);
  return (
    <ChildScreen band={DEFAULT_BAND}>
      <main className="placeholder">
        <LoadState result={snapshot}>{() => null}</LoadState>
      </main>
    </ChildScreen>
  );
}
