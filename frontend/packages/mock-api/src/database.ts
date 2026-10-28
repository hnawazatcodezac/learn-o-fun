import {
  IsoDate,
  LearningEvent,
  LearningSession,
  SignUpDetails,
  Timestamp,
  Uuidv7,
  type CatalogResponse,
  type Features,
  type Item,
  type MarketConfig,
} from '@learnofun/contracts';
import { itemFromId } from '@learnofun/learning-core';
import { z } from 'zod';
import { MockRecords, type MockData } from './data';
import { playScripts, type ScriptedHistory } from './scripts';
import type { MockStorage } from './storage';

/** Everything the mock API can change, as saved between reloads. */
export const MockState = MockRecords.extend({
  sessions: z.array(LearningSession),
  /** The append-only event log, ordered by session and sequence (CLAUDE.md rule 3). */
  events: z.array(LearningEvent),
  /** Who is signed in to the parent dashboard, as a real API keeps a session (ADR 0025). */
  signedInAccountId: Uuidv7.optional(),
  /** Sign-in links not yet used (ADR 0046), each for one email; older saved state has none. */
  magicLinks: z
    .array(
      z.object({
        token: z.string().min(1),
        email: z.string().min(1),
        signUp: SignUpDetails.optional(),
        expiresAt: z.int(),
      }),
    )
    .default([]),
  /** Parents' mocked passkeys (ADR 0046); the device keeps its credential IDs. */
  passkeys: z
    .array(z.object({ credentialId: z.string().min(1), accountId: Uuidv7, createdAt: Timestamp }))
    .default([]),
  /** The family this device was handed to (ADR 0046); until then, the first family. */
  deviceFamilyId: Uuidv7.optional(),
  /** More play a grown-up allowed on one day (ADR 0022). Older saved state has none. */
  timeGrants: z
    .array(z.object({ childId: Uuidv7, date: IsoDate, minutes: z.int().min(1) }))
    .default([]),
  /** Which data file the state grew from; state from another one is discarded. */
  dataFingerprint: z.string().optional(),
});

export type MockState = z.infer<typeof MockState>;

/** A short, stable fingerprint of the data file (FNV-1a), to notice when it has changed. */
function fingerprintOf(seed: MockData): string {
  let hash = 0x811c9dc5;
  for (const char of JSON.stringify(seed)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** The scripted history of each data file, played once (ADR 0028). */
const histories = new WeakMap<MockData, ScriptedHistory>();

function historyOf(seed: MockData): ScriptedHistory {
  const known = histories.get(seed);
  if (known) return known;
  const history = playScripts(
    seed.sessionScripts,
    seed.catalog.activities,
    seed.catalog.skillGraph.skills,
    seed.catalog.release,
  );
  histories.set(seed, history);
  return history;
}

function parseStored(text: string | null, fingerprint: string): MockState | undefined {
  if (text === null) return undefined;
  try {
    const result = MockState.safeParse(JSON.parse(text));
    return result.success && result.data.dataFingerprint === fingerprint ? result.data : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The mock API's data: the read-only catalog plus records that change and are saved after every
 * change. Saved state that no longer matches the contracts, or grew from an older data file, is
 * discarded for a fresh start. The past-session scripts are played into the first events.
 */
export class MockDatabase {
  readonly catalog: CatalogResponse;
  readonly markets: readonly MarketConfig[];
  /** What a family that signs up starts with (ADR 0046). */
  readonly freePlanFeatures: Features;
  /** The data file's accounts, which the sign-in offers as demo accounts (ADR 0025). */
  readonly demoAccountIds: ReadonlySet<string>;
  private readonly history: ScriptedHistory;
  private readonly fingerprint: string;
  private current: MockState;

  constructor(
    private readonly seed: MockData,
    private readonly storage: MockStorage,
  ) {
    this.catalog = seed.catalog;
    this.markets = seed.markets;
    this.freePlanFeatures = seed.freePlanFeatures;
    this.demoAccountIds = new Set(seed.accounts.map((account) => account.id));
    this.history = historyOf(seed);
    this.fingerprint = fingerprintOf(seed);
    this.current = parseStored(storage.read(), this.fingerprint) ?? this.initial();
  }

  get state(): Readonly<MockState> {
    return this.current;
  }

  /**
   * An item by its ID, to grade an answer again as the server does (ADR 0028): one the scripts
   * made, or one a template makes, rebuilt from the features its ID names.
   */
  itemOf(itemId: string): Item | undefined {
    return this.history.items.get(itemId) ?? itemFromId(this.catalog.itemTemplates, itemId);
  }

  /** Applies a change and saves the result. */
  update(change: (state: MockState) => void) {
    change(this.current);
    this.storage.write(JSON.stringify(this.current));
  }

  /** Forgets every change, back to the data file. */
  reset() {
    this.storage.remove();
    this.current = this.initial();
  }

  private initial(): MockState {
    const { accounts, families, children, settings, goals, entitlements, consents } = this.seed;
    return structuredClone({
      accounts,
      families,
      children,
      settings,
      goals,
      entitlements,
      consents,
      magicLinks: [],
      passkeys: [],
      sessions: this.history.sessions,
      events: this.history.events,
      timeGrants: [],
      dataFingerprint: this.fingerprint,
    });
  }
}
