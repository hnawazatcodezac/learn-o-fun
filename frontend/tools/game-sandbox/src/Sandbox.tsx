import { MODES, type LocalizedText } from '@learnofun/contracts';
import { GAME_IDS, loadGame } from '@learnofun/game-registry';
import type { GamePackage } from '@learnofun/game-sdk';
import { LOCALES, PSEUDO_LOCALES, localizeContent, pickLocale } from '@learnofun/i18n';
import { AppearanceProvider, TEXT_SCALES, THEMES, useI18n } from '@learnofun/ui-kit';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { EventLog } from './EventLog';
import { paramsToSearch, pickGame, readParams, selectStory, type SandboxParams } from './params';
import { createRunStore, startRun, type Problem, type Run } from './run';
import { ToolbarSelect } from './ToolbarSelect';

const SANDBOX_LOCALES = [...LOCALES, ...PSEUDO_LOCALES];
const ALL_ITEMS = '';

type Loaded = { id: string; pkg: GamePackage } | { id: string; error: string };

/**
 * Plays any registered game with any of its stories, a single item, any age band, locale, theme
 * and setting, through the real session runner, and shows every learning event beside it (plan
 * 6.8). Development only.
 */
export function Sandbox() {
  const { t, translate, locale, changeLocale, format } = useI18n();
  const [params, setParams] = useState(() => readParams(window.location.search));
  const [loaded, setLoaded] = useState<Loaded>();
  const [restarts, setRestarts] = useState(0);
  const [store] = useState(createRunStore);
  const run = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const stageRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<Run>(undefined);
  const stageId = useId();
  const title = t('dev.sandbox.title');

  const gameId = pickGame(GAME_IDS, params.game);
  const current = loaded?.id === gameId ? loaded : undefined;
  const pkg = current && 'pkg' in current ? current.pkg : undefined;
  const loadError = current && 'error' in current ? current.error : undefined;
  const { band, story, item, mode } = params;
  const selection = useMemo(
    () => (pkg ? selectStory(pkg, { band, story, item, mode }) : undefined),
    [pkg, band, story, item, mode],
  );
  const localize = useCallback((text: LocalizedText) => localizeContent(text, locale), [locale]);
  const formatNumber = useCallback((value: number) => format.number(value), [format]);

  useEffect(() => {
    document.title = title;
  }, [title]);

  useEffect(() => {
    if (gameId === undefined) return;
    let active = true;
    loadGame(gameId)?.then(
      (game) => {
        if (active) setLoaded({ id: gameId, pkg: game });
      },
      (error: unknown) => {
        if (active) setLoaded({ id: gameId, error: String(error) });
      },
    );
    return () => {
      active = false;
    };
  }, [gameId]);

  // Keep the resolved setup in the URL, so the address bar always reproduces what is on screen.
  const resolved = useMemo<SandboxParams>(
    () => ({
      ...params,
      game: gameId,
      band: selection ? selection.band : params.band,
      story: selection ? selection.story?.id : params.story,
      item: selection ? selection.item?.id : params.item,
    }),
    [params, gameId, selection],
  );
  useEffect(() => {
    const search = paramsToSearch(resolved, window.location.search);
    if (search !== window.location.search) window.history.replaceState(null, '', search);
  }, [resolved]);

  // Any change to what the game receives starts a new session; theme and font are only styles.
  const { seed, reducedMotion, textScale } = params;
  useEffect(() => {
    const stage = stageRef.current;
    if (!pkg || !selection?.story || !stage) return;
    const root = document.createElement('div');
    root.className = 'sandbox-game';
    stage.append(root);
    const started = startRun(store, {
      game: pkg.game,
      root,
      items: selection.items,
      mode: selection.mode,
      seed,
      t: translate,
      localize,
      formatNumber,
      settings: { reducedMotion, sound: true, textScale },
    });
    runRef.current = started;
    return () => {
      started.stop();
      runRef.current = undefined;
      root.remove();
      store.reset();
    };
  }, [
    store,
    pkg,
    selection,
    seed,
    reducedMotion,
    textScale,
    translate,
    localize,
    formatNumber,
    restarts,
  ]);

  const update = (change: Partial<SandboxParams>) => {
    setParams((previous) => ({ ...previous, ...change }));
  };
  const controller = () => runRef.current?.controller;

  const problemText = (problem: Problem): string => {
    switch (problem.kind) {
      case 'invalid-event':
        return t('dev.sandbox.problems.invalidEvent', {
          sequence: problem.sequence,
          type: problem.type,
          message: problem.message,
        });
      case 'undeclared-string':
        return t('dev.sandbox.problems.undeclaredString', { key: problem.key });
      case 'undeclared-signal':
        return t('dev.sandbox.problems.undeclaredSignal', { name: problem.name });
      case 'signal-kind':
        return t('dev.sandbox.problems.signalKind', {
          name: problem.name,
          expected: problem.expected,
        });
      case 'game-error':
        return t('dev.sandbox.problems.gameError', { message: problem.message });
    }
  };

  let status: string;
  if (gameId === undefined) status = t('dev.sandbox.status.noGames');
  else if (loadError !== undefined)
    status = t('dev.sandbox.status.loadError', { message: loadError });
  else if (!selection) status = t('dev.sandbox.status.loading');
  else if (!selection.story) status = t('dev.sandbox.status.noStory');
  else status = t(`dev.sandbox.status.${run.status}`);

  const answer = run.lastAnswer;
  const playing = selection?.story !== undefined && run.status === 'playing';
  const paused = selection?.story !== undefined && run.status === 'paused';

  return (
    <AppearanceProvider
      band={selection?.band}
      theme={params.theme}
      reducedMotion={params.reducedMotion}
      textScale={params.textScale}
      font={params.font}
    >
      <header className="sandbox-toolbar">
        <h1 className="sandbox-toolbar__title">{title}</h1>
        <ToolbarSelect
          label={t('dev.sandbox.controls.game')}
          value={gameId ?? ''}
          options={GAME_IDS.map((id) => ({ value: id, label: id }))}
          onChange={(game) => {
            update({ game, band: undefined, story: undefined, item: undefined });
          }}
        />
        {selection && (
          <>
            <ToolbarSelect
              label={t('dev.preview.controls.band')}
              value={selection.band}
              options={selection.bands.map((id) => ({
                value: id,
                label: t(`dev.preview.bands.${id}`),
              }))}
              onChange={(next) => {
                update({ band: next, story: undefined, item: undefined });
              }}
            />
            <ToolbarSelect
              label={t('dev.sandbox.controls.story')}
              value={selection.story?.id ?? ''}
              options={selection.stories.map((entry) => ({ value: entry.id, label: entry.title }))}
              onChange={(next) => {
                update({ story: next, item: undefined });
              }}
            />
            <ToolbarSelect
              label={t('dev.sandbox.controls.item')}
              value={selection.item?.id ?? ALL_ITEMS}
              options={[
                { value: ALL_ITEMS, label: t('dev.sandbox.controls.allItems') },
                ...(selection.story?.items ?? []).map((entry) => ({
                  value: entry.id,
                  label: entry.id,
                })),
              ]}
              onChange={(next) => {
                update({ item: next === ALL_ITEMS ? undefined : next });
              }}
            />
            <ToolbarSelect
              label={t('dev.sandbox.controls.mode')}
              value={selection.mode}
              options={MODES.map((id) => ({ value: id, label: t(`dev.sandbox.modes.${id}`) }))}
              onChange={(next) => {
                update({ mode: next });
              }}
            />
          </>
        )}
        <ToolbarSelect
          label={t('dev.localeSwitcher.label')}
          value={locale}
          options={SANDBOX_LOCALES.map((id) => ({
            value: id,
            label: t(`dev.localeSwitcher.locales.${id}`),
          }))}
          onChange={(next) => {
            changeLocale(pickLocale(next, { allowPseudo: true }));
          }}
        />
        <ToolbarSelect
          label={t('dev.preview.controls.theme')}
          value={params.theme}
          options={THEMES.map((id) => ({ value: id, label: t(`dev.preview.themes.${id}`) }))}
          onChange={(theme) => {
            update({ theme });
          }}
        />
        <ToolbarSelect
          label={t('dev.preview.controls.textSize')}
          value={String(params.textScale)}
          options={TEXT_SCALES.map((scale) => ({
            value: String(scale),
            label: format.number(scale, { style: 'percent' }),
          }))}
          onChange={(value) => {
            update({ textScale: TEXT_SCALES.find((scale) => String(scale) === value) ?? 1 });
          }}
        />
        <label className="sandbox-toggle">
          <input
            type="checkbox"
            checked={params.font === 'dyslexia'}
            onChange={(event) => {
              update({ font: event.target.checked ? 'dyslexia' : 'default' });
            }}
          />
          {t('dev.preview.controls.dyslexiaFont')}
        </label>
        <label className="sandbox-toggle">
          <input
            type="checkbox"
            checked={params.reducedMotion}
            onChange={(event) => {
              update({ reducedMotion: event.target.checked });
            }}
          />
          {t('dev.preview.controls.reducedMotion')}
        </label>
      </header>
      <main className="sandbox-main">
        <section className="sandbox-play" aria-labelledby={stageId}>
          <h2 id={stageId} className="sandbox-panel__title">
            {t('dev.sandbox.stage')}
          </h2>
          <div className="sandbox-actions">
            <button
              type="button"
              className="sandbox-button"
              onClick={() => {
                setRestarts((count) => count + 1);
              }}
            >
              {t('dev.sandbox.actions.restart')}
            </button>
            <button
              type="button"
              className="sandbox-button"
              disabled={!playing}
              onClick={() => {
                controller()?.pause('backgrounded');
              }}
            >
              {t('dev.sandbox.actions.pause')}
            </button>
            <button
              type="button"
              className="sandbox-button"
              disabled={!paused}
              onClick={() => {
                controller()?.resume('backgrounded');
              }}
            >
              {t('dev.sandbox.actions.resume')}
            </button>
            <button
              type="button"
              className="sandbox-button"
              disabled={!playing || !run.canHint}
              onClick={() => {
                controller()?.hint();
              }}
            >
              {t('dev.sandbox.actions.hint')}
            </button>
            <button
              type="button"
              className="sandbox-button"
              disabled={!playing}
              onClick={() => {
                controller()?.skip();
              }}
            >
              {t('dev.sandbox.actions.skip')}
            </button>
            <button
              type="button"
              className="sandbox-button"
              disabled={!playing && !paused}
              onClick={() => {
                controller()?.end('child-left');
              }}
            >
              {t('dev.sandbox.actions.end')}
            </button>
          </div>
          <div role="status" className="sandbox-status" data-testid="sandbox-status">
            <p>{status}</p>
            {answer && (
              <p data-testid="last-answer">
                {answer.correct
                  ? t('dev.sandbox.answer.right')
                  : t('dev.sandbox.answer.wrong', {
                      support: t(`dev.sandbox.support.${answer.support}`),
                    })}
              </p>
            )}
          </div>
          <div ref={stageRef} className="sandbox-stage" data-testid="sandbox-stage" />
        </section>
        <aside className="sandbox-side">
          {run.problems.length > 0 && (
            <section className="sandbox-panel sandbox-panel--problems" data-testid="problems">
              <h2 className="sandbox-panel__title">{t('dev.sandbox.problems.title')}</h2>
              <ul className="sandbox-problems">
                {run.problems.map((problem, index) => (
                  // Problems are only ever added, so the index is stable.
                  <li key={index}>{problemText(problem)}</li>
                ))}
              </ul>
            </section>
          )}
          <EventLog events={run.events} />
        </aside>
      </main>
    </AppearanceProvider>
  );
}
