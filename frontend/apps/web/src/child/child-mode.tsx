import {
  DEFAULT_PLAY_SETTINGS,
  type ChildSettings,
  type ChildSnapshot,
  type PicturePin,
  type PlaySettings,
  type PlayToday,
} from '@learnofun/contracts';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../api/client';
import { useApi, type ApiResult } from '../api/useApi';
import { childApi, expireOldSessions, outbox } from './sync';

/**
 * Today's play, newer news over older: within one day, play only grows, so a slower answer (from
 * before a session's last events arrived) never takes away what this device already counted.
 */
export function mergePlayToday(older: PlayToday | undefined, newer: PlayToday): PlayToday {
  if (older?.date !== newer.date) return newer;
  return { ...newer, playedSeconds: Math.max(older.playedSeconds, newer.playedSeconds) };
}

/** The device remembers who is playing, so a refresh keeps the same child (ADR 0018). */
const CHILD_KEY = 'learnofun.childMode.childId';

function readChild(): string | undefined {
  try {
    return localStorage.getItem(CHILD_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeChild(childId: string | undefined) {
  try {
    if (childId === undefined) localStorage.removeItem(CHILD_KEY);
    else localStorage.setItem(CHILD_KEY, childId);
  } catch {
    // Storage can be unavailable, as in a private window; the child is then chosen each visit.
  }
}

interface ChildModeValue {
  /** The child playing on this device, once one is chosen in the profile picker. */
  childId: string | undefined;
  /** That child's snapshot: profile, settings and what the family's plan includes. */
  snapshot: ApiResult<ChildSnapshot | undefined>;
  choose: (childId: string) => void;
  /** Back to the profile picker: nobody is playing. */
  leave: () => void;
  /** The play settings in use: the child's, or this visit's while nobody is playing. */
  settings: PlaySettings;
  setSettings: (next: PlaySettings) => void;
  setPicturePin: (pin: PicturePin | undefined) => void;
  /**
   * Fetches today's play again, quietly, keeping what is shown if it fails (ADR 0022). Screens
   * call it as they open, since the snapshot is loaded once a visit.
   */
  refreshPlayToday: () => void;
  /** Today's play as the API now has it, such as after a grown-up allows more time. */
  setPlayToday: (playToday: PlayToday) => void;
}

const noSnapshot: ApiResult<undefined> = {
  status: 'ready',
  data: undefined,
  retry: () => undefined,
};

const ChildModeContext = createContext<ChildModeValue>({
  childId: undefined,
  snapshot: noSnapshot,
  choose: () => undefined,
  leave: () => undefined,
  settings: DEFAULT_PLAY_SETTINGS,
  setSettings: () => undefined,
  setPicturePin: () => undefined,
  refreshPlayToday: () => undefined,
  setPlayToday: () => undefined,
});

/**
 * Child mode for the whole child area: who is playing and their settings. A settings change is
 * shown at once and goes to the API through the outbox, so one made offline arrives once the
 * device is back online (ADR 0023). Until then it shows on this device for this visit only.
 */
export function ChildModeProvider({ children }: { children: ReactNode }) {
  const [childId, setChildId] = useState(readChild);
  // Sessions left for more than a day are closed as the child area opens (plan 5.4).
  useEffect(() => {
    void expireOldSessions().catch(() => undefined);
  }, []);
  const load = useCallback(
    () => (childId === undefined ? Promise.resolve(undefined) : childApi.snapshot(childId)),
    [childId],
  );
  const snapshot = useApi(load);
  // Changes made on this device, ahead of the snapshot, which was loaded before them.
  const [edited, setEdited] = useState<ChildSettings>();
  // With nobody playing, as on the development play route, settings last for this visit only.
  const [unsaved, setUnsaved] = useState<PlaySettings>(DEFAULT_PLAY_SETTINGS);
  // Today's play fetched since the snapshot, for this child.
  const [fresh, setFresh] = useState<{ childId: string; playToday: PlayToday }>();

  const loaded = snapshot.status === 'ready' ? snapshot.data : undefined;
  const current = edited?.childId === childId ? edited : loaded?.settings;
  const playToday = fresh && fresh.childId === childId ? fresh.playToday : loaded?.playToday;
  // The same object until the snapshot, the settings or today's play change, so pages can depend
  // on it.
  const data = useMemo(
    () => (loaded && current && playToday ? { ...loaded, settings: current, playToday } : loaded),
    [loaded, current, playToday],
  );
  const newPlayToday = useCallback(
    (forChild: string, next: PlayToday) => {
      setFresh((previous) => ({
        childId: forChild,
        playToday: mergePlayToday(
          previous?.childId === forChild ? previous.playToday : loaded?.playToday,
          next,
        ),
      }));
    },
    [loaded],
  );
  const refreshPlayToday = useCallback(() => {
    if (childId === undefined) return;
    api
      .snapshot(childId)
      .then((next) => {
        newPlayToday(childId, next.playToday);
      })
      .catch(() => undefined);
  }, [childId, newPlayToday]);
  const setPlayToday = useCallback(
    (next: PlayToday) => {
      if (childId !== undefined) newPlayToday(childId, next);
    },
    [childId, newPlayToday],
  );
  const save = (next: ChildSettings) => {
    setEdited(next);
    // Through the outbox, so a change made offline reaches the API later (ADR 0023).
    outbox.queueSettings(next);
  };

  const value: ChildModeValue = {
    childId,
    snapshot: snapshot.status === 'ready' ? { ...snapshot, data } : snapshot,
    choose: (next) => {
      writeChild(next);
      setChildId(next);
    },
    leave: () => {
      writeChild(undefined);
      setChildId(undefined);
    },
    settings: current ?? unsaved,
    setSettings: (next) => {
      if (current) save({ ...current, ...next });
      else setUnsaved(next);
    },
    setPicturePin: (pin) => {
      if (!current) return;
      const next: ChildSettings = { ...current };
      delete next.picturePin;
      save(pin === undefined ? next : { ...next, picturePin: pin });
    },
    refreshPlayToday,
    setPlayToday,
  };

  return <ChildModeContext value={value}>{children}</ChildModeContext>;
}

export function useChildMode(): ChildModeValue {
  return useContext(ChildModeContext);
}

/** The play settings and their setter, for screens and the game shell. */
export function useChildSettings(): Pick<ChildModeValue, 'settings' | 'setSettings'> {
  const { settings, setSettings } = useChildMode();
  return { settings, setSettings };
}
