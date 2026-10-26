import { MODES, type ExperienceBand, type Item, type Mode } from '@learnofun/contracts';
import type { GamePackage, GameStory } from '@learnofun/game-sdk';
import {
  FONTS,
  TEXT_SCALES,
  THEMES,
  type Font,
  type TextScale,
  type Theme,
} from '@learnofun/ui-kit';

/**
 * Everything the sandbox can vary, kept in the URL, so a link reproduces a setup exactly. The
 * locale has its own `?locale=` parameter, as in the apps. `seed` is set in the URL only.
 */
export interface SandboxParams {
  game: string | undefined;
  band: string | undefined;
  story: string | undefined;
  /** One item from the story, or undefined for all of them. */
  item: string | undefined;
  /** Practice or Challenge, or undefined for the story's own mode. */
  mode: Mode | undefined;
  seed: number;
  theme: Theme;
  reducedMotion: boolean;
  textScale: TextScale;
  font: Font;
}

export const DEFAULT_SEED = 1;

function pick<T extends string>(options: readonly T[], value: string | null, fallback: T): T {
  return options.find((option) => option === value) ?? fallback;
}

export function readParams(search: string): SandboxParams {
  const params = new URLSearchParams(search);
  const seed = Number(params.get('seed') ?? DEFAULT_SEED);
  return {
    game: params.get('game') ?? undefined,
    band: params.get('band') ?? undefined,
    story: params.get('story') ?? undefined,
    item: params.get('item') ?? undefined,
    mode: MODES.find((mode) => mode === params.get('mode')),
    seed: Number.isSafeInteger(seed) && seed >= 0 ? seed : DEFAULT_SEED,
    theme: pick(THEMES, params.get('theme'), 'system'),
    reducedMotion: params.get('motion') === 'reduced',
    textScale: TEXT_SCALES.find((scale) => String(scale) === params.get('textScale')) ?? 1,
    font: pick(FONTS, params.get('font'), 'default'),
  };
}

/** Writes the settings into the URL, leaving out defaults and keeping other parameters. */
export function paramsToSearch(params: SandboxParams, current: string): string {
  const search = new URLSearchParams(current);
  const values: [string, string | undefined][] = [
    ['game', params.game],
    ['band', params.band],
    ['story', params.story],
    ['item', params.item],
    ['mode', params.mode],
    ['seed', params.seed === DEFAULT_SEED ? undefined : String(params.seed)],
    ['theme', params.theme === 'system' ? undefined : params.theme],
    ['motion', params.reducedMotion ? 'reduced' : undefined],
    ['textScale', params.textScale === 1 ? undefined : String(params.textScale)],
    ['font', params.font === 'default' ? undefined : params.font],
  ];
  for (const [name, value] of values) {
    if (value === undefined) search.delete(name);
    else search.set(name, value);
  }
  return `?${search.toString()}`;
}

/** The game ID to load: the one asked for if it is registered, or else the first game. */
export function pickGame(
  ids: readonly string[],
  requested: string | undefined,
): string | undefined {
  return ids.find((id) => id === requested) ?? ids[0];
}

export interface Selection {
  /** The bands the game supports, for the band menu. */
  bands: readonly ExperienceBand[];
  band: ExperienceBand;
  /** The game's stories for that band, for the story menu. */
  stories: readonly GameStory[];
  /** Undefined when the game has no story for the band, which the game's own tests forbid. */
  story: GameStory | undefined;
  item: Item | undefined;
  /** What the session plays: the chosen item, or the whole story. */
  items: readonly Item[];
  mode: Mode;
}

/**
 * Resolves the band, story and item asked for against what the game provides, falling back to
 * the first of each, so any URL gives a playable setup.
 */
export function selectStory(
  pkg: GamePackage,
  params: Pick<SandboxParams, 'band' | 'story' | 'item' | 'mode'>,
): Selection {
  const bands = pkg.game.manifest.experienceBands;
  const band = bands.find((id) => id === params.band) ?? bands[0] ?? 'early-primary';
  const stories = pkg.stories.filter((story) => story.band === band);
  const story = stories.find((candidate) => candidate.id === params.story) ?? stories[0];
  const item = story?.items.find((candidate) => candidate.id === params.item);
  return {
    bands,
    band,
    stories,
    story,
    item,
    items: item ? [item] : (story?.items ?? []),
    mode: params.mode ?? story?.mode ?? 'practice',
  };
}
