import { MODES, type Mode } from '@learnofun/contracts';
import { GAME_IDS, loadGame } from '@learnofun/game-registry';
import type { GamePackage } from '@learnofun/game-sdk';
import { useI18n } from '@learnofun/ui-kit';
import { useCallback, useMemo, useState } from 'react';
import { useQueryParam, useSearchParams } from '../../shared/navigation';
import { useApi } from '../../api/useApi';
import { LoadState } from '../../shared/LoadState';
import { NotFound } from '../../shared/NotFound';
import { PLACEHOLDER_CLASSES } from '../../shared/page-classes';
import { ChildScreen } from '../ChildScreen';
import { DEFAULT_BAND } from '../config';
import { recordDevEvents } from './dev-events';
import { GameShell } from './GameShell';
import { PlayErrorBoundary } from './PlayError';

/** A made-up child and content release, so development play never touches real profiles. */
const DEV_CHILD_ID = '0192f4c1-0000-7000-8000-0000000000de';
const DEV_CONTENT_RELEASE = 'dev';
const EXIT_TO = '/';

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}

/**
 * /play/dev?game=<id>, with the development tools only: plays one of a game's stories in the real
 * game shell (FRONTEND-KICKOFF step 8). `?story=` picks the story, `?mode=` overrides its mode and
 * `?seed=` fixes the seed.
 */
export function DevPlay() {
  const gameId = useQueryParam('game');
  const known = GAME_IDS.includes(gameId);
  const load = useCallback(
    () => loadGame(gameId) ?? Promise.reject(new Error(`No game ${gameId}`)),
    [gameId],
  );
  const result = useApi(load);

  if (!known) {
    return (
      <ChildScreen band={DEFAULT_BAND}>
        <NotFound homePath={EXIT_TO} />
      </ChildScreen>
    );
  }
  if (result.status !== 'ready') {
    return (
      <ChildScreen band={DEFAULT_BAND}>
        <main className={PLACEHOLDER_CLASSES}>
          <LoadState result={result}>{() => null}</LoadState>
        </main>
      </ChildScreen>
    );
  }
  return <DevGame pkg={result.data} />;
}

/** A game's own name, from the strings it declares; a story's title is development text. */
const GAME_TITLE = /^games\.[^.]+\.title$/;

function DevGame({ pkg }: { pkg: GamePackage }) {
  const { t, translate } = useI18n();
  const [search] = useSearchParams();
  const titleKey = pkg.game.manifest.strings.find((key) => GAME_TITLE.test(key));
  const [seed] = useState(() => {
    const fixed = Number(search.get('seed'));
    return search.has('seed') && Number.isSafeInteger(fixed) && fixed >= 0 ? fixed : randomSeed();
  });
  const story = pkg.stories.find((entry) => entry.id === search.get('story')) ?? pkg.stories[0];
  const mode: Mode =
    MODES.find((entry) => entry === search.get('mode')) ?? story?.mode ?? 'practice';
  const gameId = pkg.game.manifest.id;
  const setup = useMemo(
    () => ({
      childId: DEV_CHILD_ID,
      activityId: `dev-${gameId}`,
      contentRelease: DEV_CONTENT_RELEASE,
    }),
    [gameId],
  );

  if (!story) {
    return (
      <ChildScreen band={DEFAULT_BAND}>
        <NotFound homePath={EXIT_TO} />
      </ChildScreen>
    );
  }
  return (
    <ChildScreen band={story.band}>
      <PlayErrorBoundary exitTo={EXIT_TO}>
        <GameShell
          key={`${story.id}:${mode}:${String(seed)}`}
          title={titleKey ? translate(titleKey) : t('child.play.stage')}
          game={pkg.game}
          items={story.items}
          mode={mode}
          band={story.band}
          setup={setup}
          seed={seed}
          emit={recordDevEvents}
          exitTo={EXIT_TO}
        />
      </PlayErrorBoundary>
    </ChildScreen>
  );
}
