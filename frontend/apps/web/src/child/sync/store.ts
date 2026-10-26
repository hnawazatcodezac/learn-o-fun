/**
 * Records kept on the device, each under its own key (ADR 0023): the outbox and the saved
 * sessions. The browser keeps them in IndexedDB; tests use the in-memory version.
 */
export interface RecordStore<T extends { key: string }> {
  all(): Promise<T[]>;
  get(key: string): Promise<T | undefined>;
  /** Adds the records, replacing any with the same key. */
  put(records: readonly T[]): Promise<void>;
  remove(keys: readonly string[]): Promise<void>;
}

/** A store that lasts as long as the page: for tests, and where IndexedDB is unavailable. */
export function memoryStore<T extends { key: string }>(): RecordStore<T> {
  const records = new Map<string, T>();
  return {
    all: () => Promise.resolve([...records.values()].map((record) => structuredClone(record))),
    get: (key) => {
      const record = records.get(key);
      return Promise.resolve(record === undefined ? undefined : structuredClone(record));
    },
    put: (next) => {
      for (const record of next) records.set(record.key, structuredClone(record));
      return Promise.resolve();
    },
    remove: (keys) => {
      for (const key of keys) records.delete(key);
      return Promise.resolve();
    },
  };
}

const DATABASE = 'learnofun';
const VERSION = 2;
/**
 * The object stores in the device's database, each keyed by `key`: the outbox and the saved
 * sessions (ADR 0023), and the last data the API gave, for offline use (ADR 0024).
 */
export const STORES = ['outbox', 'sessions', 'data'] as const;
export type StoreName = (typeof STORES)[number];

let opening: Promise<IDBDatabase | undefined> | undefined;

/** Opens the device's database once; undefined where IndexedDB cannot be used. */
function open(): Promise<IDBDatabase | undefined> {
  opening ??= new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(undefined);
      return;
    }
    const request = indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = () => {
      for (const name of STORES) {
        if (!request.result.objectStoreNames.contains(name)) {
          request.result.createObjectStore(name, { keyPath: 'key' });
        }
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      resolve(undefined);
    };
    request.onblocked = () => {
      resolve(undefined);
    };
  });
  return opening;
}

/** Runs one transaction, and resolves with its request's result once it has committed. */
function transact<R>(
  database: IDBDatabase,
  name: StoreName,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<R> | undefined,
): Promise<R | undefined> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(name, mode);
    const request = work(transaction.objectStore(name));
    transaction.oncomplete = () => {
      resolve(request?.result);
    };
    transaction.onerror = () => {
      reject(transaction.error ?? new Error(`IndexedDB ${name} failed`));
    };
    transaction.onabort = () => {
      reject(transaction.error ?? new Error(`IndexedDB ${name} was aborted`));
    };
  });
}

/**
 * A store in the device's IndexedDB database. Where IndexedDB cannot be used, as in some private
 * windows, it falls back to memory: nothing is lost while the page is open.
 */
export function indexedDbStore<T extends { key: string }>(name: StoreName): RecordStore<T> {
  const fallback = memoryStore<T>();
  const run = async <R>(
    withDatabase: (database: IDBDatabase) => Promise<R>,
    withMemory: () => Promise<R>,
  ): Promise<R> => {
    const database = await open();
    return database ? withDatabase(database) : withMemory();
  };
  return {
    all: () =>
      run(
        async (database) =>
          ((await transact(database, name, 'readonly', (store) => store.getAll())) ?? []) as T[],
        () => fallback.all(),
      ),
    get: (key) =>
      run(
        async (database) =>
          (await transact(database, name, 'readonly', (store) => store.get(key))) as T | undefined,
        () => fallback.get(key),
      ),
    put: (records) =>
      run(
        async (database) => {
          await transact(database, name, 'readwrite', (store) => {
            for (const record of records) store.put(record);
            return undefined;
          });
        },
        () => fallback.put(records),
      ),
    remove: (keys) =>
      run(
        async (database) => {
          await transact(database, name, 'readwrite', (store) => {
            for (const key of keys) store.delete(key);
            return undefined;
          });
        },
        () => fallback.remove(keys),
      ),
  };
}
