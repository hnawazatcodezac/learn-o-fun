/** Where the mock API keeps what must survive a reload. */
export interface MockStorage {
  read(): string | null;
  write(value: string): void;
  remove(): void;
}

/** In-memory storage, for tests. */
export function memoryStorage(initial: string | null = null): MockStorage {
  let value = initial;
  return {
    read: () => value,
    write: (next) => {
      value = next;
    },
    remove: () => {
      value = null;
    },
  };
}

/**
 * The browser's localStorage under one key. Storage can be missing or blocked, for example in a
 * private window; the mock API then simply starts fresh on every load.
 */
export function browserStorage(key: string): MockStorage {
  return {
    read: () => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    write: (value) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Not persisted; the session still works.
      }
    },
    remove: () => {
      try {
        localStorage.removeItem(key);
      } catch {
        // Nothing to remove.
      }
    },
  };
}
