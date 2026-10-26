import type { FieldScene } from '@learnofun/contracts';
import type { GameModule, GradeResult, SupportLevel } from '@learnofun/game-sdk';
import { CROPS, EXPLAINED_MISCONCEPTIONS, manifest } from './manifest';
import './game.css';

const SVG = 'http://www.w3.org/2000/svg';

/** The most rows a field holds (the field scene, ADR 0038). */
const MAX_ROWS = 10;
/** Equal groups: rows of bare soil drawn before any is planted, so the field keeps its size. */
const SOIL_ROWS = 4;

/** A field's layout in SVG units. It scales with the screen's width. */
const PLOT = { size: 40, gap: 6, radius: 8, plant: 14 } as const;
/** The space at each row's end, for its tick and, with the hint, its running total. */
const END = { width: 92, tick: 26, gap: 6, text: 24 } as const;
/** A sunflower's petals, around its centre. */
const PETALS = 8;

/** How long the worked "show me" and the Challenge answer stay on each step, in milliseconds. */
const TIMING = { showMeStep: 700, showMeEnd: 2000, reveal: 1500, tick: 50 } as const;

type Crop = (typeof CROPS)[number];
const isCrop = (id: string): id is Crop => CROPS.some((known) => known === id);
const isExplained = (id: string | undefined): id is (typeof EXPLAINED_MISCONCEPTIONS)[number] =>
  EXPLAINED_MISCONCEPTIONS.some((known) => known === id);

/** An SVG path from its commands and numbers. */
const path = (...parts: (string | number)[]) => parts.map(String).join(' ');

/** What one item asks for, read from its scene and answer. */
interface Order {
  scene: FieldScene;
  crop: Crop;
  answer: number;
}

/**
 * Tile Farm (BRIEF.md): a farmer asks for crops in rows. The child plants a whole row at a time,
 * so the groups are equal, then counts the plants on the farm's counter, which starts at nothing:
 * a row at a time, or one by one. Equal groups name the rows; arrays draw the field's outline.
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
      const created = element('button', `g-tile-farm__button g-tile-farm__button--${modifier}`);
      created.type = 'button';
      created.textContent = ctx.t(key);
      created.addEventListener('click', onPress);
      return created;
    };

    const container = element('div', 'g-tile-farm');
    const order = element('p', 'g-tile-farm__order');
    const instructions = element('p', 'g-tile-farm__instructions');
    // The field is one control (BRIEF.md, accessibility): Up plants a row, Down digs one up,
    // Right adds a row to the count, + and − count single plants, and Enter gives the count.
    const field = element('div', 'g-tile-farm__field');
    field.setAttribute('role', 'spinbutton');
    field.setAttribute('aria-label', ctx.t('games.tileFarm.field'));
    field.tabIndex = 0;
    const count = element('p', 'g-tile-farm__count');
    const message = element('p', 'g-tile-farm__message');
    message.setAttribute('role', 'status');
    const controls = element('div', 'g-tile-farm__controls');
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', ctx.t('games.tileFarm.controls'));
    // Challenge counts single plants only: the child counts, or knows the fact (BRIEF.md).
    const byRows = ctx.mode === 'practice';
    if (!byRows) controls.classList.add('g-tile-farm__controls--by-ones');
    container.append(order, instructions, field, message, controls);
    root.append(container);

    let current: Order | undefined;
    /** Rows planted, each a whole row of the scene's length. */
    let planted = 0;
    /** The farm's counter: the count the child gives. */
    let counted = 0;
    /** The answer shown in full, once it is revealed. */
    let revealed = false;
    let answering = false;
    let paused = false;
    let hinted = false;
    let demonstrating = false;
    let destroyed = false;

    const canMove = () => current !== undefined && answering && !paused && !demonstrating;

    /** Waits, counting only the time the game is not paused, and stops early once destroyed. */
    const wait = async (ms: number) => {
      let left = ms;
      while (left > 0 && !destroyed) {
        await new Promise((resolve) => setTimeout(resolve, TIMING.tick));
        if (!paused) left -= TIMING.tick;
      }
    };

    const rowLength = () => current?.scene.rowLength ?? 0;
    /** The most rows the child can plant: an array's outline, or a whole field of equal groups. */
    const mostRows = () => (current?.scene.task === 'array' ? current.scene.rows : MAX_ROWS);
    /**
     * The counter goes as high as the largest field, never stopping at the plants planted, so the
     * child, not the game, decides when the count is done (BRIEF.md, build notes).
     */
    const mostCounted = () => MAX_ROWS * rowLength();
    /** The rows the count has reached: each gets its tick. */
    const rowsCounted = () =>
      current ? Math.min(planted, Math.floor(counted / current.scene.rowLength)) : 0;

    /** A placeholder plant, a distinct shape for each crop, centred on a plot. */
    function plantShape(crop: Crop, cx: number, cy: number) {
      const r = PLOT.plant;
      const group = svg('g', { class: `g-tile-farm__plant g-tile-farm__plant--${crop}` });
      const shapes: Record<Crop, () => SVGElement[]> = {
        carrot: () => [
          svg('path', {
            d: path('M', cx - r, cy - r / 2, 'L', cx + r, cy - r / 2, 'L', cx, cy + r, 'Z'),
          }),
          svg('path', {
            class: 'stem',
            d: path(
              'M',
              cx,
              cy - r / 2,
              'L',
              cx - r / 3,
              cy - r - 2,
              'M',
              cx,
              cy - r / 2,
              'L',
              cx + r / 3,
              cy - r - 2,
            ),
          }),
        ],
        cabbage: () => [svg('circle', { cx, cy, r }), svg('circle', { cx, cy, r: r / 2 })],
        sunflower: () => [
          ...Array.from({ length: PETALS }, (_, petal) => {
            const angle = (2 * Math.PI * petal) / PETALS;
            return svg('circle', {
              cx: cx + 0.7 * r * Math.cos(angle),
              cy: cy + 0.7 * r * Math.sin(angle),
              r: r / 3,
            });
          }),
          svg('circle', { cx, cy, r: r / 2 }),
        ],
      };
      group.append(...shapes[crop]());
      return group;
    }

    /** The field: its rows, planted or bare, each counted row's tick, and with the hint the totals. */
    function drawField() {
      if (!current) return;
      const { task, rows, rowLength: length } = current.scene;
      const shown = task === 'array' ? rows : Math.max(SOIL_ROWS, planted);
      const step = PLOT.size + PLOT.gap;
      const plotsWidth = PLOT.gap + length * step;
      const width = plotsWidth + END.width;
      const height = PLOT.gap + shown * step;
      // Rows fill from the start side, so the field mirrors in right-to-left text (BRIEF.md).
      const mirrored = getComputedStyle(field).direction === 'rtl';
      const x = (start: number, size = 0) => (mirrored ? width - start - size : start);
      const scene = svg('svg', {
        viewBox: `0 0 ${String(width)} ${String(height)}`,
        'aria-hidden': 'true',
        focusable: 'false',
      });
      if (task === 'array') {
        // The outline, dashed: rows by columns (not colour alone).
        const outlineWidth = plotsWidth - PLOT.gap;
        scene.append(
          svg('rect', {
            class: 'g-tile-farm__outline',
            x: x(PLOT.gap / 2, outlineWidth),
            y: PLOT.gap / 2,
            width: outlineWidth,
            height: height - PLOT.gap,
            rx: PLOT.radius,
          }),
        );
      }
      const ticked = rowsCounted();
      for (let row = 0; row < shown; row += 1) {
        const top = PLOT.gap + row * step;
        const middle = top + PLOT.size / 2;
        if (row >= planted && task === 'equal-groups') {
          // Bare soil: no plots until a row is planted.
          const soilWidth = plotsWidth - 2 * PLOT.gap;
          scene.append(
            svg('rect', {
              class: 'g-tile-farm__soil',
              x: x(PLOT.gap, soilWidth),
              y: top,
              width: soilWidth,
              height: PLOT.size,
              rx: PLOT.radius,
            }),
          );
          continue;
        }
        for (let column = 0; column < length; column += 1) {
          const left = x(PLOT.gap + column * step, PLOT.size);
          scene.append(
            svg('rect', {
              class:
                row < planted ? 'g-tile-farm__plot' : 'g-tile-farm__plot g-tile-farm__plot--empty',
              x: left,
              y: top,
              width: PLOT.size,
              height: PLOT.size,
              rx: PLOT.radius,
            }),
          );
          if (row < planted) scene.append(plantShape(current.crop, left + PLOT.size / 2, middle));
        }
        if (row >= planted) continue;
        if (row < ticked) {
          // A counted row gets a tick (not colour alone).
          const left = x(plotsWidth, END.tick);
          scene.append(
            svg('path', {
              class: 'g-tile-farm__tick',
              d: path(
                'M',
                left + 4,
                middle,
                'L',
                left + 10,
                middle + 7,
                'L',
                left + 22,
                middle - 8,
              ),
            }),
          );
        }
        if (hinted) {
          // The hint: each row's running total at its end, dimmed until it is counted.
          const label = svg('text', {
            class:
              row < ticked ? 'g-tile-farm__total' : 'g-tile-farm__total g-tile-farm__total--dim',
            x: x(plotsWidth + END.tick + END.gap),
            y: middle,
            'dominant-baseline': 'central',
            'text-anchor': mirrored ? 'end' : 'start',
            'font-size': END.text,
          });
          label.textContent = ctx.t('games.tileFarm.runningTotal', { total: (row + 1) * length });
          scene.append(label);
        }
      }
      field.replaceChildren(scene);
    }

    function draw() {
      if (!current) return;
      drawField();
      count.textContent = ctx.t('games.tileFarm.counted', { count: counted });
      field.setAttribute('aria-valuemin', '0');
      field.setAttribute('aria-valuemax', String(mostCounted()));
      field.setAttribute('aria-valuenow', String(counted));
      field.setAttribute(
        'aria-valuetext',
        ctx.t('games.tileFarm.value', { rows: planted, length: rowLength(), count: counted }),
      );
      updateControls();
    }

    function updateControls() {
      const movable = canMove();
      field.setAttribute('aria-disabled', String(!movable));
      digButton.disabled = !movable || planted <= 0;
      plantButton.disabled = !movable || planted >= mostRows();
      takeOneButton.disabled = !movable || counted <= 0;
      addOneButton.disabled = !movable || counted >= mostCounted();
      addRowButton.hidden = !byRows;
      addRowButton.disabled = !movable || counted + rowLength() > mostCounted();
      doneButton.disabled = !movable;
    }

    /** A whole row planted, or the last one dug up. */
    const plant = (step: 1 | -1) => {
      if (!canMove()) return;
      planted = Math.min(mostRows(), Math.max(0, planted + step));
      draw();
    };
    /** The counter, up or down: by one plant, or in Practice by a row's worth. */
    const countBy = (step: number) => {
      if (!canMove()) return;
      const next = counted + step;
      if (next < 0 || next > mostCounted()) return;
      counted = next;
      draw();
    };
    const addRow = () => {
      if (byRows) countBy(rowLength());
    };
    const done = () => {
      if (!canMove()) return;
      answering = false;
      updateControls();
      ctx.respond({ type: 'numeric', value: { kind: 'decimal', value: counted } });
    };

    const digButton = button(
      'games.tileFarm.dig',
      () => {
        plant(-1);
      },
      'dig',
    );
    const plantButton = button(
      'games.tileFarm.plant',
      () => {
        plant(1);
      },
      'plant',
    );
    const takeOneButton = button(
      'games.tileFarm.takeOne',
      () => {
        countBy(-1);
      },
      'take-one',
    );
    const addOneButton = button(
      'games.tileFarm.addOne',
      () => {
        countBy(1);
      },
      'add-one',
    );
    const addRowButton = button('games.tileFarm.addRow', addRow, 'add-row');
    const doneButton = button('games.tileFarm.done', done, 'done');
    // The counter sits beside Done: the count it gives.
    controls.append(
      digButton,
      plantButton,
      takeOneButton,
      addOneButton,
      addRowButton,
      count,
      doneButton,
    );
    field.addEventListener('keydown', (event) => {
      const actions: Record<string, (() => void) | undefined> = {
        ArrowUp: () => {
          plant(1);
        },
        ArrowDown: () => {
          plant(-1);
        },
        ArrowRight: addRow,
        '+': () => {
          countBy(1);
        },
        '-': () => {
          countBy(-1);
        },
        Enter: done,
        ' ': done,
      };
      const action = actions[event.key];
      if (!action) return;
      event.preventDefault();
      action();
    });

    /** A row's worth, again and again: "4 + 4 + 4", or the running totals "4, 8, 12". */
    function repeated(kind: 'sum' | 'list', rows: number, length: number): string {
      let text = ctx.formatNumber(length);
      for (let row = 2; row <= rows; row += 1) {
        text =
          kind === 'sum'
            ? ctx.t('games.tileFarm.sum.more', { sum: text, value: length })
            : ctx.t('games.tileFarm.list.more', { list: text, value: row * length });
      }
      return text;
    }

    /** The order as numbers, once it is answered or shown. */
    function sumText(): string {
      if (!current) return '';
      const { scene, answer } = current;
      return scene.task === 'equal-groups'
        ? ctx.t('games.tileFarm.sum.groups', {
            terms: repeated('sum', scene.rows, scene.rowLength),
            total: answer,
          })
        : ctx.t('games.tileFarm.sum.array', {
            rows: scene.rows,
            length: scene.rowLength,
            total: answer,
          });
    }

    /** The sentence that says the answer, after the "show me" or in Challenge. */
    const answerText = () =>
      current
        ? ctx.t('games.tileFarm.answer', {
            rows: current.scene.rows,
            length: current.scene.rowLength,
            total: current.answer,
          })
        : '';

    /** The explanation a misconception triggers (BRIEF.md), if the game knows it. */
    const explanationFor = (result: GradeResult) => {
      if (!current || !isExplained(result.misconceptionId)) return undefined;
      const { rows, rowLength: length } = current.scene;
      return ctx.t(`games.tileFarm.explanations.${result.misconceptionId}`, {
        rows,
        length,
        totals: repeated('list', rows, length),
      });
    };

    const showHint = () => {
      if (!current) return;
      hinted = true;
      message.textContent = ctx.t('games.tileFarm.hint');
      draw();
    };

    /** The right field and count, each row's total, and the order as numbers. */
    const reveal = () => {
      if (!current) return;
      revealed = true;
      hinted = true;
      planted = current.scene.rows;
      counted = current.answer;
      order.textContent = sumText();
      draw();
    };

    /** The worked "show me": the farmer plants the field, then counts it a row at a time, aloud. */
    async function showMe(explanation: string | undefined) {
      if (!current) return;
      demonstrating = true;
      const { rows, rowLength: length } = current.scene;
      planted = rows;
      counted = 0;
      hinted = true;
      message.textContent = ctx.t('games.tileFarm.showMe');
      draw();
      await wait(TIMING.showMeStep);
      for (let row = 1; row <= rows && !destroyed; row += 1) {
        counted = row * length;
        draw();
        message.textContent = ctx.t('games.tileFarm.showMeStep', { count: counted });
        await wait(TIMING.showMeStep);
      }
      reveal();
      message.textContent = explanation ?? answerText();
      await wait(TIMING.showMeEnd);
      demonstrating = false;
    }

    return {
      present({ item }) {
        if (item.type !== 'numeric' || item.scene?.kind !== 'field') {
          throw new Error(`${manifest.id} renders field numeric items, not ${item.type}`);
        }
        if (item.answer.kind !== 'decimal') throw new Error(`${item.id} has no whole answer`);
        const { scene } = item;
        if (!isCrop(scene.crop)) throw new Error(`${item.id} has a crop the farm cannot draw`);
        current = { scene, crop: scene.crop, answer: item.answer.value };
        planted = 0;
        counted = 0;
        revealed = false;
        hinted = false;
        demonstrating = false;
        answering = true;
        order.textContent =
          scene.task === 'equal-groups'
            ? ctx.t('games.tileFarm.order.equalGroups', {
                rows: scene.rows,
                crop: ctx.t(`games.tileFarm.crop.${scene.crop}`, { count: scene.rowLength }),
              })
            : ctx.t('games.tileFarm.order.array', { rows: scene.rows, columns: scene.rowLength });
        instructions.textContent = ctx.t(
          scene.task === 'equal-groups'
            ? 'games.tileFarm.instructions.equalGroups'
            : 'games.tileFarm.instructions.array',
        );
        message.textContent = '';
        draw();
        field.focus();
        return Promise.resolve();
      },
      async feedback(result: GradeResult, support: SupportLevel) {
        if (!current) return;
        answering = false;
        if (result.correct) {
          message.textContent = '';
          if (!revealed) order.textContent = sumText();
          draw();
          return;
        }
        const explanation = explanationFor(result);
        if (support === 'encouragement' || support === 'hint') {
          // Another try: the field and the count stay as the child left them, to fix (BRIEF.md).
          if (support === 'hint') showHint();
          message.textContent = explanation ?? ctx.t('games.tileFarm.tryAgain');
          answering = true;
          draw();
          field.focus();
          return;
        }
        if (support === 'worked-example') {
          await showMe(explanation);
          return;
        }
        // Challenge: one attempt, then each row's total and the right count, without a lesson.
        reveal();
        message.textContent = answerText();
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
