import type { ParentSessionState } from '@learnofun/contracts';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import { useApi, type ApiResult } from '../api/useApi';

/** The family a parent last looked at, remembered on this device. */
const FAMILY_KEY = 'learnofun.parent.familyId';

function readFamily(): string | undefined {
  try {
    return localStorage.getItem(FAMILY_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeFamily(familyId: string) {
  try {
    localStorage.setItem(FAMILY_KEY, familyId);
  } catch {
    // Storage can be unavailable; the first family is shown each visit.
  }
}

interface ParentSessionValue {
  /** Who is signed in and their families, or no session when nobody is. */
  session: ApiResult<ParentSessionState>;
  /** The family the dashboard shows: the one last chosen, or the first. */
  familyId: string | undefined;
  chooseFamily: (familyId: string) => void;
  signIn: (accountId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const ParentSessionContext = createContext<ParentSessionValue | undefined>(undefined);

/**
 * The parent dashboard's session (ADR 0025): the mock API keeps who is signed in, as a real API
 * would keep a session, and the dashboard asks it on every visit.
 */
export function ParentSessionProvider({ children }: { children: ReactNode }) {
  const session = useApi(api.parentSession);
  const [chosen, setChosen] = useState(readFamily);

  const families = session.status === 'ready' ? (session.data.session?.families ?? []) : [];
  const familyId =
    families.find(({ family }) => family.id === chosen)?.family.id ?? families[0]?.family.id;

  const value: ParentSessionValue = {
    session,
    familyId,
    chooseFamily: (next) => {
      writeFamily(next);
      setChosen(next);
    },
    // Signing in or out changes who the API says is signed in, so it is asked again.
    signIn: async (accountId) => {
      await api.signIn(accountId);
      session.retry();
    },
    signOut: async () => {
      await api.signOut();
      session.retry();
    },
  };
  return <ParentSessionContext value={value}>{children}</ParentSessionContext>;
}

export function useParentSession(): ParentSessionValue {
  const value = useContext(ParentSessionContext);
  if (!value) throw new Error('useParentSession needs a ParentSessionProvider');
  return value;
}
