import { useEffect, useState } from 'react';

type Settled<T> = { status: 'ready'; data: T } | { status: 'error'; error: unknown };

export type ApiResult<T> = ({ status: 'loading' } | Settled<T>) & { retry: () => void };

/**
 * Loads data and keeps its state. Pass a stable function, such as `api.profiles`, or one made
 * with `useCallback`. A result for an older function or attempt is never shown.
 */
export function useApi<T>(load: () => Promise<T>): ApiResult<T> {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{
    load: () => Promise<T>;
    attempt: number;
    state: Settled<T>;
  } | null>(null);

  useEffect(() => {
    let current = true;
    load().then(
      (data) => {
        if (current) setSettled({ load, attempt, state: { status: 'ready', data } });
      },
      (error: unknown) => {
        if (current) setSettled({ load, attempt, state: { status: 'error', error } });
      },
    );
    return () => {
      current = false;
    };
  }, [load, attempt]);

  const retry = () => {
    setAttempt((count) => count + 1);
  };
  const isCurrent = settled?.load === load && settled.attempt === attempt;
  return { ...(isCurrent ? settled.state : { status: 'loading' }), retry };
}
