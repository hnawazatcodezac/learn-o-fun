/*
 * Live reload, on the development server only (SandboxApp loads this module there). Next.js runs a
 * changed module again with the modules that import it, so this module imports every game and
 * the packages the sandbox and the games run on. A change to any of that code runs it again, and
 * it then reloads the page: the session starts again with the new code, and the address brings
 * back the same setup. React components and styles still update in place. The registry loads
 * games only when they are played, and a change stops there, hence the games' own imports here.
 */
import.meta.glob(
  [
    '../../../packages/games/*/src/index.ts',
    '../../../packages/{contracts,game-sdk,i18n,learning-core,ui-kit}/src/index.ts',
  ],
  { eager: true },
);

declare global {
  var learnofunSandboxStarted: boolean | undefined;
}

if (globalThis.learnofunSandboxStarted) window.location.reload();
globalThis.learnofunSandboxStarted = true;
