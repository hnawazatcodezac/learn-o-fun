import type { PlacementItem } from '@learnofun/contracts';
import type { GameModule, GradeResult, SupportLevel } from '@learnofun/game-sdk';
import { EXPLAINED_MISCONCEPTIONS, manifest } from './manifest';

type Line = Extract<PlacementItem['surface'], { kind: 'line' }> & { start: number };

const SVG = 'http://www.w3.org/2000/svg';

/** The scene's layout in SVG units. It scales with the screen's width. */
const SCENE = {
  width: 860,
  height: 168,
  margin: 24,
  lineY: 112,
  tickHalf: 8,
  labelY: 154,
  labelPadding: 4,
  /** The frog sits just above the line, below the numbers on its hops. */
  frogY: 94,
  arcLift: 10,
  arcRise: 50,
} as const;

/** How long the worked "show me" and the Challenge answer stay on each step, in milliseconds. */
const TIMING = { showMeHop: 600, showMeEnd: 2000, reveal: 1500, tick: 50 } as const;

/*
 * The game's look: Tailwind utilities on the design system's theme (ADR 0043), beside the
 * g-hop-line hooks that tests find elements by. SVG sizes are in the scene's own units, which
 * scale with the line's width, so the drawing's widths, dashes and text sizes are its attributes.
 */
const CONTAINER_CLASSES =
  'g-hop-line flex inline-full flex-col items-center gap-3 px-1 py-3 text-center';

/** Every numeral in a maths game is in the display face (design system README). */
const SUM_CLASSES = 'g-hop-line__sum m-0 font-display text-play-number';

const INSTRUCTIONS_CLASSES = 'g-hop-line__instructions m-0 text-ink-muted';

const COUNTER_CLASSES = 'g-hop-line__counter m-0 min-block-lh font-display text-play-label';

const MESSAGE_CLASSES = 'g-hop-line__message m-0 min-block-lh font-display text-play-label';

/** The number line: one keyboard control, the full width of the game up to a comfortable size. */
const TRACK_CLASSES =
  'g-hop-line__track inline-full max-inline-ui-scene cursor-default rounded-ui focus-visible:shadow-focus-ring focus-visible:outline-none';

const SCENE_CLASSES = 'block inline-full block-auto';

const LINE_CLASSES = {
  axis: 'g-hop-line__axis stroke-ink stroke-3',
  tick: 'g-hop-line__tick stroke-ink stroke-2',
  labelledTick: 'g-hop-line__tick g-hop-line__tick--labelled stroke-ink stroke-3',
  label: 'g-hop-line__label fill-ink font-display',
  markedLabel: 'g-hop-line__label g-hop-line__label--marked fill-ink font-display font-label',
  // The start has a solid outline and the answer a dashed one: not colour alone.
  start: 'g-hop-line__marker g-hop-line__marker--start fill-none stroke-ink stroke-2',
  answer: 'g-hop-line__marker g-hop-line__marker--answer fill-none stroke-ink stroke-2',
  arc: 'g-hop-line__arc fill-none stroke-ink stroke-3',
  arcNumber: 'g-hop-line__arc-number fill-ink-muted font-display',
};

/** A placeholder frog, until the art is made. Its hop follows the motion setting. */
const FROG_CLASSES = {
  frog: 'g-hop-line__frog cursor-pointer transition-transform duration-ui-medium',
  body: 'g-hop-line__frog-body fill-ui-primary stroke-ink stroke-2',
  eye: 'g-hop-line__frog-eye fill-surface-raised stroke-ink stroke-2',
  pupil: 'g-hop-line__frog-pupil fill-ink',
};

/** The hint's footprints: outlined for hops still to make, filled once made. */
const FOOTPRINTS_CLASSES =
  'g-hop-line__footprints flex flex-wrap justify-center gap-2 [&[hidden]]:hidden';

const FOOTPRINT_CLASSES = {
  toMake:
    'g-hop-line__footprint inline-ui-footprint-x block-ui-footprint-y rounded-ui-footprint border-2 border-ink',
  made: 'g-hop-line__footprint g-hop-line__footprint--made inline-ui-footprint-x block-ui-footprint-y rounded-ui-footprint border-2 border-ink bg-ink',
};

/** On phones, the controls share one row in equal columns, so long labels never wrap the row. */
const CONTROLS_CLASSES =
  'g-hop-line__controls flex flex-wrap justify-center gap-3 max-phone:grid max-phone:inline-full max-phone:auto-cols-fr max-phone:grid-flow-col';

/** Play buttons sit on a ledge; pressed, they move down 6px and the ledge disappears. */
const BUTTON_CLASSES =
  'min-block-ui-target min-inline-ui-target cursor-pointer rounded-ui border-2 border-ui-secondary-border px-5 font-display text-play-label shadow-press-depth transition-[translate,box-shadow] enabled:active:translate-y-ui-press enabled:active:shadow-none focus-visible:shadow-with-focus-press-depth focus-visible:outline-none disabled:cursor-default disabled:border-ui-disabled-border disabled:bg-ui-disabled disabled:text-ui-on-disabled disabled:shadow-none max-phone:px-2';

const BUTTON_COLOUR_CLASSES = {
  secondary: 'bg-ui-secondary text-ui-on-secondary',
  primary: 'bg-ui-primary text-ui-on-primary',
};

/** SVG text in the scene's own units: the numbers, and the hops' numbers above them. */
const LABEL_TEXT = { 'font-size': 30, 'font-weight': 700 } as const;
const ARC_TEXT = { 'font-size': 18, 'font-weight': 700 } as const;

const isExplained = (id: string | undefined): id is (typeof EXPLAINED_MISCONCEPTIONS)[number] =>
  EXPLAINED_MISCONCEPTIONS.some((known) => known === id);

/**
 * Hop Line (BRIEF.md): the frog starts on the first number of a sum, the child hops it forward one
 * number at a time and lands it on the answer. Counting on is the action itself.
 */
export const game: GameModule = {
  manifest,
  mount(ctx, root) {
    const element = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string) => {
      const created = document.createElement(tag);
      created.className = className;
      return created;
    };
    const svg = <K extends keyof SVGElementTagNameMap>(
      tag: K,
      attributes: Record<string, string | number>,
    ) => {
      const created = document.createElementNS(SVG, tag);
      for (const [name, value] of Object.entries(attributes)) {
        created.setAttribute(name, String(value));
      }
      return created;
    };
    const button = (key: string, onPress: () => void, modifier: string) => {
      const colours = modifier === 'land' ? 'primary' : 'secondary';
      const created = element(
        'button',
        `g-hop-line__button g-hop-line__button--${modifier} ${BUTTON_CLASSES} ${BUTTON_COLOUR_CLASSES[colours]}`,
      );
      created.type = 'button';
      created.textContent = ctx.t(key);
      created.addEventListener('click', onPress);
      return created;
    };

    const container = element('div', CONTAINER_CLASSES);
    const sum = element('p', SUM_CLASSES);
    const instructions = element('p', INSTRUCTIONS_CLASSES);
    // The number line is one control: arrow keys hop, Enter lands (BRIEF.md, accessibility).
    const track = element('div', TRACK_CLASSES);
    track.setAttribute('role', 'slider');
    track.setAttribute('aria-label', ctx.t('games.hopLine.line'));
    track.setAttribute('aria-orientation', 'horizontal');
    // A maths number line never mirrors (plan 7.2): 0 stays on the left.
    track.dir = 'ltr';
    track.tabIndex = 0;
    const scene = svg('svg', {
      class: SCENE_CLASSES,
      viewBox: `0 0 ${String(SCENE.width)} ${String(SCENE.height)}`,
      'aria-hidden': 'true',
      focusable: 'false',
    });
    const staticLayer = svg('g', {});
    const hopLayer = svg('g', {});
    const frog = svg('g', { class: FROG_CLASSES.frog });
    frog.append(
      svg('ellipse', { class: FROG_CLASSES.body, cx: 0, cy: 0, rx: 22, ry: 16 }),
      svg('circle', { class: FROG_CLASSES.eye, cx: -9, cy: -14, r: 6 }),
      svg('circle', { class: FROG_CLASSES.eye, cx: 9, cy: -14, r: 6 }),
      svg('circle', { class: FROG_CLASSES.pupil, cx: -9, cy: -14, r: 2.5 }),
      svg('circle', { class: FROG_CLASSES.pupil, cx: 9, cy: -14, r: 2.5 }),
    );
    scene.append(staticLayer, hopLayer, frog);
    track.append(scene);
    const counter = element('p', COUNTER_CLASSES);
    counter.hidden = ctx.mode === 'challenge';
    const footprints = element('div', FOOTPRINTS_CLASSES);
    footprints.setAttribute('role', 'img');
    const message = element('p', MESSAGE_CLASSES);
    message.setAttribute('role', 'status');
    const controls = element('div', CONTROLS_CLASSES);
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', ctx.t('games.hopLine.controls'));
    container.append(sum, instructions, track, counter, footprints, message, controls);
    root.append(container);

    let line: Line | undefined;
    let position = 0;
    /** The answer to mark on the line, once it is shown. */
    let shownAnswer: number | undefined;
    let answering = false;
    let paused = false;
    let hinted = false;
    /** The frog is hopping by itself in the worked "show me". */
    let demonstrating = false;
    let destroyed = false;

    const canMove = () => line !== undefined && answering && !paused && !demonstrating;
    const hopsMade = () => (line ? position - line.start : 0);
    const hopsNeeded = () => (line ? line.target - line.start : 0);

    /** Waits, counting only the time the game is not paused, and stops early once destroyed. */
    const wait = async (ms: number) => {
      let left = ms;
      while (left > 0 && !destroyed) {
        await new Promise((resolve) => setTimeout(resolve, TIMING.tick));
        if (!paused) left -= TIMING.tick;
      }
    };

    const xOf = (value: number) => {
      if (!line) return 0;
      const unit = (SCENE.width - 2 * SCENE.margin) / (line.max - line.min);
      return SCENE.margin + (value - line.min) * unit;
    };

    /** The line, its marks and labels, and the start and answer marked by an outline. */
    function drawLine() {
      staticLayer.replaceChildren();
      if (!line) return;
      const every = hinted ? 1 : line.labelEvery;
      staticLayer.append(
        svg('line', {
          class: LINE_CLASSES.axis,
          'stroke-linecap': 'round',
          x1: xOf(line.min),
          x2: xOf(line.max),
          y1: SCENE.lineY,
          y2: SCENE.lineY,
        }),
      );
      for (let value = line.min; value <= line.max; value += 1) {
        const labelled =
          (value - line.min) % every === 0 || value === line.start || value === shownAnswer;
        const x = xOf(value);
        staticLayer.append(
          svg('line', {
            class: labelled ? LINE_CLASSES.labelledTick : LINE_CLASSES.tick,
            'stroke-linecap': 'round',
            x1: x,
            x2: x,
            y1: SCENE.lineY - SCENE.tickHalf,
            y2: SCENE.lineY + SCENE.tickHalf,
          }),
        );
        if (!labelled) continue;
        const marked = value === line.start || value === shownAnswer;
        const label = svg('text', {
          class: marked ? LINE_CLASSES.markedLabel : LINE_CLASSES.label,
          ...LABEL_TEXT,
          x,
          y: SCENE.labelY,
          'text-anchor': 'middle',
        });
        label.textContent = ctx.formatNumber(value);
        staticLayer.append(label);
        if (marked) {
          const outline = value === line.start ? 'start' : 'answer';
          const half = (SCENE.width - 2 * SCENE.margin) / (line.max - line.min) / 2;
          staticLayer.append(
            svg('rect', {
              class: LINE_CLASSES[outline],
              ...(outline === 'answer' ? { 'stroke-dasharray': '6 4' } : {}),
              x: x - half + SCENE.labelPadding / 2,
              y: SCENE.labelY - 30,
              width: 2 * half - SCENE.labelPadding,
              height: 40,
              rx: 8,
            }),
          );
        }
      }
    }

    /** The hops made so far, as numbered arcs, and everything that follows the frog. */
    function drawHops() {
      hopLayer.replaceChildren();
      if (!line) return;
      const made = hopsMade();
      const step = Math.sign(made);
      for (let hop = 1; hop <= Math.abs(made); hop += 1) {
        const from = xOf(line.start + (hop - 1) * step);
        const to = xOf(line.start + hop * step);
        const base = SCENE.lineY - SCENE.arcLift;
        const apex = base - SCENE.arcRise;
        hopLayer.append(
          svg('path', {
            class: LINE_CLASSES.arc,
            'stroke-linecap': 'round',
            d: `M ${String(from)} ${String(base)} Q ${String((from + to) / 2)} ${String(apex - SCENE.arcRise)} ${String(to)} ${String(base)}`,
          }),
        );
        const number = svg('text', {
          class: LINE_CLASSES.arcNumber,
          ...ARC_TEXT,
          x: (from + to) / 2,
          y: apex - 6,
          'text-anchor': 'middle',
        });
        number.textContent = ctx.formatNumber(hop);
        hopLayer.append(number);
      }
      frog.style.transform = `translate(${String(xOf(position))}px, ${String(SCENE.frogY)}px)`;

      const count =
        made >= 0
          ? ctx.t('games.hopLine.counter', { hops: made })
          : ctx.t('games.hopLine.counterBack', { hops: -made });
      counter.textContent = count;
      track.setAttribute('aria-valuemin', String(line.min));
      track.setAttribute('aria-valuemax', String(line.max));
      track.setAttribute('aria-valuenow', String(position));
      track.setAttribute(
        'aria-valuetext',
        ctx.mode === 'challenge'
          ? ctx.t('games.hopLine.position', { position })
          : made >= 0
            ? ctx.t('games.hopLine.positionHops', { position, hops: made })
            : ctx.t('games.hopLine.positionHopsBack', { position, hops: -made }),
      );

      footprints.hidden = !hinted;
      const needed = hopsNeeded();
      const done = Math.min(Math.max(made, 0), needed);
      footprints.setAttribute(
        'aria-label',
        ctx.t('games.hopLine.footprints', { done, total: needed }),
      );
      footprints.replaceChildren(
        ...Array.from({ length: needed }, (_, index) =>
          element('span', index < done ? FOOTPRINT_CLASSES.made : FOOTPRINT_CLASSES.toMake),
        ),
      );
      updateControls();
    }

    function updateControls() {
      const movable = canMove();
      track.setAttribute('aria-disabled', String(!movable));
      backButton.disabled = !movable || !line || position <= line.min;
      hopButton.disabled = !movable || !line || position >= line.max;
      landButton.disabled = !movable;
    }

    const moveTo = (next: number) => {
      if (!canMove() || !line) return;
      position = Math.min(line.max, Math.max(line.min, next));
      drawHops();
    };
    const hop = () => {
      moveTo(position + 1);
    };
    const back = () => {
      moveTo(position - 1);
    };
    const land = () => {
      if (!canMove()) return;
      answering = false;
      updateControls();
      ctx.respond({ type: 'placement', at: { kind: 'line', position } });
    };

    const backButton = button('games.hopLine.back', back, 'back');
    const hopButton = button('games.hopLine.hop', hop, 'hop');
    const landButton = button('games.hopLine.land', land, 'land');
    controls.append(backButton, hopButton, landButton);
    frog.addEventListener('click', hop);
    track.addEventListener('keydown', (event) => {
      const actions: Record<string, (() => void) | undefined> = {
        ArrowRight: hop,
        ArrowUp: hop,
        ArrowLeft: back,
        ArrowDown: back,
        Home: () => {
          if (line) moveTo(line.start);
        },
        Enter: land,
        ' ': land,
      };
      const action = actions[event.key];
      if (!action) return;
      event.preventDefault();
      action();
    });

    const sumText = (answered: boolean) => {
      if (!line) return '';
      const values = { start: line.start, hops: hopsNeeded(), sum: line.target };
      return ctx.t(answered ? 'games.hopLine.sumAnswered' : 'games.hopLine.sum', values);
    };

    /** The explanation a misconception triggers (BRIEF.md), if the game knows it. */
    const explanationFor = (result: GradeResult) => {
      if (!line || !isExplained(result.misconceptionId)) return undefined;
      return ctx.t(`games.hopLine.explanations.${result.misconceptionId}`, {
        start: line.start,
        next: line.start + 1,
        hops: hopsNeeded(),
      });
    };

    const showHint = () => {
      hinted = true;
      message.textContent = ctx.t('games.hopLine.hint', { hops: hopsNeeded() });
      drawLine();
      drawHops();
    };

    const reveal = () => {
      if (!line) return;
      shownAnswer = line.target;
      sum.textContent = sumText(true);
      drawLine();
      drawHops();
    };

    /** The worked "show me": the frog makes the hops itself, saying each number it lands on. */
    async function showMe(explanation: string | undefined) {
      if (!line) return;
      demonstrating = true;
      position = line.start;
      message.textContent = ctx.t('games.hopLine.showMe', { start: line.start });
      drawHops();
      await wait(TIMING.showMeHop);
      for (let next = line.start + 1; next <= line.target && !destroyed; next += 1) {
        position = next;
        drawHops();
        message.textContent = ctx.t('games.hopLine.showMeStep', { position: next });
        await wait(TIMING.showMeHop);
      }
      reveal();
      message.textContent = explanation ?? ctx.t('games.hopLine.answer', { sum: line.target });
      await wait(TIMING.showMeEnd);
      demonstrating = false;
    }

    return {
      present({ item }) {
        if (item.type !== 'placement' || item.surface.kind !== 'line') {
          throw new Error(`${manifest.id} renders placements on a line, not ${item.type}`);
        }
        const { start } = item.surface;
        if (start === undefined) throw new Error(`${item.id} has no start for the frog`);
        line = { ...item.surface, start };
        position = start;
        shownAnswer = undefined;
        hinted = false;
        demonstrating = false;
        answering = true;
        sum.textContent = sumText(false);
        instructions.textContent = ctx.t('games.hopLine.instructions', {
          start,
          hops: hopsNeeded(),
        });
        message.textContent = '';
        drawLine();
        drawHops();
        track.focus();
        return Promise.resolve();
      },
      async feedback(result: GradeResult, support: SupportLevel) {
        if (!line) return;
        answering = false;
        if (result.correct) {
          message.textContent = '';
          reveal();
          return;
        }
        const explanation = explanationFor(result);
        if (support === 'encouragement' || support === 'hint') {
          // Another try: the frog hops back to the start.
          if (support === 'hint') showHint();
          message.textContent = explanation ?? ctx.t('games.hopLine.tryAgain');
          position = line.start;
          answering = true;
          drawHops();
          track.focus();
          return;
        }
        if (support === 'worked-example') {
          await showMe(explanation);
          return;
        }
        // Challenge: one attempt, then the right landing number, without a lesson.
        reveal();
        message.textContent = ctx.t('games.hopLine.answer', { sum: line.target });
        await wait(TIMING.reveal);
      },
      hint() {
        showHint();
        return Promise.resolve();
      },
      pause() {
        paused = true;
        updateControls();
      },
      resume() {
        paused = false;
        updateControls();
      },
      destroy() {
        destroyed = true;
        container.remove();
      },
    };
  },
};
