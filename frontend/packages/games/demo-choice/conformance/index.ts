/**
 * What the conformance suite needs from this game (ADR 0014): its manifest, its stories and a
 * keyboard driver. Nothing here loads the game's styles, so the suite can read it outside a
 * browser.
 */
export { manifest } from '../src/manifest';
export { stories } from '../src/stories';
export { answer } from './driver';
