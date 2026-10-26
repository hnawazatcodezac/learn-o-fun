# 0023. The offline queue and resuming sessions

- Status: accepted
- Date: 2026-10-21
- Plan section: 5.1 (event model), 5.4 (interruptions and integrity); FRONTEND-KICKOFF step 9c

## Context

Plan 5.4: events queue on the device and flush on reconnect with backoff, and a session that was left can resume on the same device within 24 hours, after which it is closed as interrupted. Until now, `session-sync.ts` kept a session's events in memory, retried only when more arrived, and lost them on a reload; settings changes made offline were lost the same way. The step's "Done when": a full session with the network off midway reaches the mock API once reconnected, with no duplicates, and a refresh mid-session resumes it.

## Options considered

1. **On resume:** the same item with the pause menu open / straight back into the item / a choice to carry on or start again.
2. **Which session resumes:** the paused session when the same activity opens / also a "Carry on" banner on Today.
3. **Storage:** IndexedDB directly / the `idb` wrapper / `localStorage`. `localStorage` is small and blocks the page; `idb` is a dependency for a few calls.

## Decision

- **Resume shows the pause menu on the same item** (the team's choice): as when a child comes back from the background, Keep playing carries on and Back to my games ends the session. The trail is where it was.
- **The paused session resumes when the same activity opens** again (the team's choice), from Today or the library. Another activity starts its own session. A saved session not seen for 24 hours is ended on the device with the reason `expired`; its pause is dated to when it was last seen, so the time away never counts as play.
- **IndexedDB, used directly**, behind two small stores: the outbox and the saved sessions. Unit tests use in-memory versions; the browser tests use the real one. No new dependency.
- **One outbox** holds, in order, sessions to create, their events and the latest settings change per child. It sends sessions first, then events in batches of at most `MAX_BATCH_SIZE`, then settings, and removes each entry once the API has accepted it. Ingest is idempotent on event IDs (plan 5.4), so sending again is harmless. A session the API refuses is dropped with its events. When sending fails, it tries again after 1 second, doubling to at most a minute, with a little jitter; it also tries at once when the browser comes back online and whenever something new is queued.
- **A running session is saved** after every event, and every few seconds while it runs: its engine state (plain data, so it can be resumed), its items, plan, seed and events, and when it was last seen. It is deleted once it completes or ends. Resuming re-queues its events, which the API ignores if it has them.
- The engine shows the interrupted item again with a new reason code, `RESUMED`; the runner reports each new state, so the app can save it.

## Consequences

- A child can lose the network, or the page, mid-session without losing what they did, and the daily limit (ADR 0022) counts play once it is sent.
- Opening the app while offline still needs the app shell and data cached, which is the PWA's job (step 9d).
- Games restart their own state on resume: the item is shown afresh, with the support so far kept by the engine.
- Revisit if sessions grow large enough that saving every event is slow, or if one child plays on two devices at once (plan 5.4 gives a session to one device).
