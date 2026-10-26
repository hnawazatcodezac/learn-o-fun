import type {
  ExperienceBand,
  GameManifest,
  Item,
  ItemResponse,
  ItemRole,
  LocalizedText,
  Mode,
  SupportLevel,
  TextScale,
} from '@learnofun/contracts';
import type { GradeResult, Random } from '@learnofun/learning-core';

export type { GameManifest, GradeResult, SupportLevel };

/** An item as the game receives it, with why it is in the session. */
export interface PresentedItem {
  item: Item;
  role: ItemRole;
}

/** Translates one of the game's message keys (its manifest `strings`). Games never hard-code text. */
export type Translate = (key: string, values?: Record<string, string | number>) => string;

/** Picks content text, such as an item's prompt or option labels, in the child's language. */
export type Localize = (text: LocalizedText) => string;

/**
 * Writes a number for the scene, such as a label on a number line, in the child's locale and
 * numbering system (plan 7.1). Numbers inside sentences go through `t`, with ICU.
 */
export type FormatNumber = (value: number) => string;

/** The shell's audio manager, which respects the sound, music and voice settings. */
export interface AudioManager {
  play(assetId: string): Promise<void>;
  stop(): void;
}

/** Where the game's assets are served from. */
export interface AssetLoader {
  url(assetId: string): string;
}

/**
 * The settings every game must respect (`.claude/rules/games.md`). Read them when they are used:
 * the game shell updates them in place when the child changes a setting mid-session.
 */
export interface GameSettings {
  reducedMotion: boolean;
  sound: boolean;
  textScale: TextScale;
}

/** The injected clock: games never read the time any other way. */
export interface Clock {
  now(): number;
}

/** Evidence a self-driven game reports itself (plan 6.3). Creative games report participation only. */
export interface Observation {
  skillId: string;
  outcome: 'success' | 'struggle' | 'participation';
  support: SupportLevel;
}

/**
 * What the platform gives a game (plan 6.2). Games render items and report what the child did;
 * they never grade, choose items, change difficulty or store progress.
 */
export interface GameContext {
  /** Reports the child's answer to the item on screen. */
  respond(response: ItemResponse): void;
  /** Interface strings, only ever through here. */
  t: Translate;
  /** Content text from items, only ever through here. */
  localize: Localize;
  audio: AudioManager;
  assets: AssetLoader;
  /** The game's own seeded random source. Never `Math.random`. */
  rng: Random;
  clock: Clock;
  settings: GameSettings;
  /** Practice or Challenge (plan 4.2). A game shows what changes between them, as its brief says. */
  mode: Mode;
  formatNumber: FormatNumber;
  /** Typed telemetry the manifest declares: a number or true/false, never text. */
  signal(name: string, value: number | boolean): void;
  /** For self-driven games only. */
  observe(observation: Observation): void;
}

/** One mounted game. */
export interface GameInstance {
  /** Shows an item. The game calls `ctx.respond` when the child answers. */
  present(item: PresentedItem): Promise<void>;
  /**
   * Shows feedback on an answer. With support `encouragement` or `hint`, the child tries the same
   * item again, so the game takes another answer; otherwise the session moves on.
   */
  feedback(result: GradeResult, support: SupportLevel): Promise<void>;
  /**
   * Shows the game's own hint for the item on screen, when the child asks for one with the
   * shell's hint button (ADR 0013). The game keeps taking the answer. `level` counts the hints
   * on this item, from 1.
   */
  hint(level: number): Promise<void>;
  pause(): void;
  resume(): void;
  destroy(): void;
}

/** What every game module provides (plan 6.2). */
export interface GameModule {
  manifest: GameManifest;
  mount(ctx: GameContext, root: HTMLElement): GameInstance;
}

/**
 * A set of items to try a game with, in one experience band: shown in the game sandbox and run
 * by the conformance suite. Every game ships stories for every band it supports (`.claude/rules/games.md`).
 */
export interface GameStory {
  id: string;
  /** A short description for the sandbox's menu. Development only. */
  title: string;
  band: ExperienceBand;
  mode?: Mode;
  items: readonly Item[];
}

/** What every game package exports. */
export interface GamePackage {
  game: GameModule;
  stories: readonly GameStory[];
}
