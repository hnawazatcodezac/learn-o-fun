/** Where the nickname of a profile just saved waits for the overview to say so (ADR 0026). */
const KEY = 'learnofun.parent.saved';

/**
 * Notes a profile just saved, for the overview the parent goes back to. It is kept in this tab
 * only, never in the address, and the overview says it once.
 */
export function noteSaved(nickname: string) {
  try {
    sessionStorage.setItem(KEY, nickname);
  } catch {
    // Without storage, the overview simply does not say it.
  }
}

/** The nickname noted, if any. Reading does not clear it, so a double render reads it too. */
export function readSaved(): string | undefined {
  try {
    return sessionStorage.getItem(KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Forgets the nickname once the overview has said it, so going back or reloading does not. */
export function clearSaved() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to forget.
  }
}
