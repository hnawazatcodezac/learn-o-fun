import { describe, expect, it } from 'vitest';
import { seedData } from './data';
import { MockDatabase } from './database';
import { memoryStorage } from './storage';

describe('MockDatabase', () => {
  it('starts from the data file', () => {
    const db = new MockDatabase(seedData, memoryStorage());

    expect(db.state.children).toEqual(seedData.children);
    // The past-session scripts, played into sessions and events (ADR 0028).
    expect(db.state.sessions).toHaveLength(seedData.sessionScripts.length);
    expect(db.state.sessions.every((session) => session.status === 'completed')).toBe(true);
    expect(db.state.events.length).toBeGreaterThan(seedData.sessionScripts.length);
  });

  it('starts afresh from state saved with another data file', () => {
    const storage = memoryStorage();
    new MockDatabase(seedData, storage).update((state) => {
      state.goals = [];
    });
    const changed = { ...seedData, meta: { ...seedData.meta, note: 'edited' } };

    expect(new MockDatabase(changed, storage).state.goals).toEqual(seedData.goals);
  });

  it('saves every change, so a reload keeps it', () => {
    const storage = memoryStorage();
    new MockDatabase(seedData, storage).update((state) => {
      state.goals = [];
    });

    expect(new MockDatabase(seedData, storage).state.goals).toEqual([]);
  });

  it('never changes the data file itself', () => {
    new MockDatabase(seedData, memoryStorage()).update((state) => {
      state.children.pop();
    });

    expect(seedData.children).toHaveLength(3);
  });

  it('resets to the data file', () => {
    const storage = memoryStorage();
    const db = new MockDatabase(seedData, storage);
    db.update((state) => {
      state.goals = [];
    });

    db.reset();

    expect(db.state.goals).toEqual(seedData.goals);
    expect(storage.read()).toBeNull();
  });

  it('starts fresh when the saved state is corrupt or out of date', () => {
    expect(new MockDatabase(seedData, memoryStorage('{not json')).state.children).toHaveLength(3);
    expect(
      new MockDatabase(seedData, memoryStorage(JSON.stringify({ children: 'old shape' }))).state
        .children,
    ).toHaveLength(3);
  });
});
