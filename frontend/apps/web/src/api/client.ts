import {
  CatalogResponse,
  ChildLearningResponse,
  ChildProfileResponse,
  ChildProgressResponse,
  ChildSessionsResponse,
  ChildSettings,
  ChildSnapshot,
  DeviceProfilesResponse,
  FamilyResponse,
  IngestResponse,
  LearningSession,
  MarketConfig,
  MockAccountsResponse,
  ParentSessionResponse,
  ParentSessionState,
  PlayToday,
  TodayResponse,
  UnlockProfileResponse,
  type ChildGoalRequest,
  type ChildProfileInput,
  type EventBatch,
  type PicturePin,
  type StartSessionRequest,
  type SubjectShare,
  type TimeLimits,
} from '@learnofun/contracts';

/** Why a request failed, in terms a screen can act on. 'signed-out': the parent must sign in. */
export type ApiErrorKind =
  'offline' | 'server' | 'not-found' | 'refused' | 'signed-out' | 'invalid-response';

export class ApiRequestError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

interface Schema<T> {
  safeParse(value: unknown): { success: true; data: T } | { success: false };
}

/** A response with no body, such as 204 No Content. */
const Empty: Schema<undefined> = { safeParse: () => ({ success: true, data: undefined }) };

/** Calls the API and checks the response against its contract before anything uses it. */
async function request<T>(
  schema: Schema<T>,
  path: string,
  send?: { method: 'PUT' | 'POST' | 'DELETE'; body?: unknown },
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(
      `/api${path}`,
      send && {
        method: send.method,
        headers: { 'content-type': 'application/json' },
        ...(send.body === undefined ? {} : { body: JSON.stringify(send.body) }),
      },
    );
  } catch {
    throw new ApiRequestError('offline', `Could not reach the API for ${path}`);
  }
  if (!response.ok) {
    const kind =
      response.status === 404
        ? 'not-found'
        : response.status === 401
          ? 'signed-out'
          : response.status >= 500
            ? 'server'
            : 'refused';
    throw new ApiRequestError(kind, `${String(response.status)} from ${path}`);
  }
  // No content: only a contract that expects none accepts it.
  let body: unknown;
  try {
    body = response.status === 204 ? undefined : await response.json();
  } catch {
    throw new ApiRequestError('invalid-response', `The response from ${path} is not JSON`);
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiRequestError('invalid-response', `The response from ${path} breaks its contract`);
  }
  return result.data;
}

/** The API under `/api`: the mock API today (ADR 0001, 0011), the real one later. */
export const api = {
  catalog: () => request(CatalogResponse, '/catalog'),
  profiles: () => request(DeviceProfilesResponse, '/device/profiles'),
  unlockProfile: (childId: string, pin: PicturePin) =>
    request(UnlockProfileResponse, `/device/profiles/${childId}/unlock`, {
      method: 'POST',
      body: { pin },
    }),
  /** The mock sign-in's accounts (ADR 0025). */
  mockAccounts: () => request(MockAccountsResponse, '/parent/accounts'),
  parentSession: () => request(ParentSessionState, '/parent/session'),
  signIn: (accountId: string) =>
    request(ParentSessionResponse, '/parent/session', { method: 'POST', body: { accountId } }),
  signOut: () => request(Empty, '/parent/session', { method: 'DELETE' }),
  family: (familyId: string) => request(FamilyResponse, `/families/${familyId}`),
  /** A market's options for child profiles: languages, curriculum and grades (ADR 0026). */
  market: (market: string) => request(MarketConfig, `/markets/${market}`),
  addChild: (familyId: string, profile: ChildProfileInput) =>
    request(ChildProfileResponse, `/families/${familyId}/children`, {
      method: 'POST',
      body: profile,
    }),
  editChild: (familyId: string, childId: string, profile: ChildProfileInput) =>
    request(ChildProfileResponse, `/families/${familyId}/children/${childId}`, {
      method: 'PUT',
      body: profile,
    }),
  /** A child's progress by skill and Today's explanations, shaped by the plan (ADR 0028). */
  childProgress: (familyId: string, childId: string) =>
    request(ChildProgressResponse, `/families/${familyId}/children/${childId}/progress`),
  /** A child's sessions with plan 5.2's measures, shaped by the plan (ADR 0029). */
  childSessions: (familyId: string, childId: string) =>
    request(ChildSessionsResponse, `/families/${familyId}/children/${childId}/sessions`),
  /** A child's goal, subject balance and time limits (ADR 0027); each save answers with them. */
  childLearning: (familyId: string, childId: string) =>
    request(ChildLearningResponse, `/families/${familyId}/children/${childId}/learning`),
  saveTimeLimits: (familyId: string, childId: string, limits: TimeLimits) =>
    request(ChildLearningResponse, `/families/${familyId}/children/${childId}/time-limits`, {
      method: 'PUT',
      body: limits,
    }),
  saveBalance: (familyId: string, childId: string, shares: readonly SubjectShare[]) =>
    request(ChildLearningResponse, `/families/${familyId}/children/${childId}/subject-balance`, {
      method: 'PUT',
      body: { shares },
    }),
  saveGoal: (familyId: string, childId: string, goal: ChildGoalRequest) =>
    request(ChildLearningResponse, `/families/${familyId}/children/${childId}/goal`, {
      method: 'PUT',
      body: goal,
    }),
  clearGoal: (familyId: string, childId: string) =>
    request(ChildLearningResponse, `/families/${familyId}/children/${childId}/goal`, {
      method: 'DELETE',
    }),
  snapshot: (childId: string) => request(ChildSnapshot, `/children/${childId}/snapshot`),
  today: (childId: string) => request(TodayResponse, `/children/${childId}/today`),
  /** A grown-up allows more play today (ADR 0022). */
  extraTime: (childId: string, minutes: number) =>
    request(PlayToday, `/children/${childId}/extra-time`, {
      method: 'POST',
      body: { minutes },
    }),
  updateSettings: (settings: ChildSettings) =>
    request(ChildSettings, `/children/${settings.childId}/settings`, {
      method: 'PUT',
      body: settings,
    }),
  startSession: (start: StartSessionRequest) =>
    request(LearningSession, '/sessions', { method: 'POST', body: start }),
  sendEvents: (batch: EventBatch) =>
    request(IngestResponse, '/events', { method: 'POST', body: batch }),
};
