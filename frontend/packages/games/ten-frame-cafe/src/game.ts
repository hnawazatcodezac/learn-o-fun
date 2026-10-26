import type { TenFrameScene } from '@learnofun/contracts';
import type { GameModule, GradeResult, SupportLevel } from '@learnofun/game-sdk';
import { EXPLAINED_MISCONCEPTIONS, FRUITS, manifest } from './manifest';
import './game.css';

const SVG = 'http://www.w3.org/2000/svg';

/** One tray holds ten, in two rows of five (BRIEF.md). */
const TRAY = 10;
const ROW = 5;

/** A tray's layout in SVG units. It scales with the screen's width. */
const CELL = { size: 56, gap: 8, radius: 10, fruit: 20 } as const;
const TRAY_WIDTH = ROW * CELL.size + (ROW + 1) * CELL.gap;
const TRAY_HEIGHT = 2 * CELL.size + 3 * CELL.gap;
/** The counter's row of spilt fruit, smaller than the tray's. */
const COUNTER = { fruit: 12, gap: 4 } as const;

/** How long the worked "show me" and the Challenge answer stay on each step, in milliseconds. */
const TIMING = { showMeStep: 600, showMeEnd: 2000, reveal: 1500, tick: 50 } as const;

type Fruit = (typeof FRUITS)[number];
const isFruit = (id: string): id is Fruit => FRUITS.some((known) => known === id);
const isExplained = (id: string | undefined): id is (typeof EXPLAINED_MISCONCEPTIONS)[number] =>
  EXPLAINED_MISCONCEPTIONS.some((known) => known === id);

/** What one item asks for, read from its scene and answer. */
interface Order {
  scene: TenFrameScene;
  fruit: Fruit;
  answer: number;
}

/**
 * Ten Frame Café (BRIEF.md): a customer asks for fruit, and the child fills ten-frame trays one
 * fruit at a time, then serves. Counting fills the trays to a number; bonds to 10 fill a part-full
 * tray; making ten moves fruit from the second tray to fill the first, then counts on from ten.
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
      const created = element(
        'button',
        `g-ten-frame-cafe__button g-ten-frame-cafe__button--${modifier}`,
      );
      created.type = 'button';
      created.textContent = ctx.t(key);
      created.addEventListener('click', onPress);
      return created;
    };

    const container = element('div', 'g-ten-frame-cafe');
    const order = element('p', 'g-ten-frame-cafe__order');
    const instructions = element('p', 'g-ten-frame-cafe__instructions');
    // The trays are one control (BRIEF.md, accessibility): Up adds, Down takes away, Right and
    // Left move fruit between trays in making ten, Enter serves.
    const trays = element('div', 'g-ten-frame-cafe__trays');
    trays.setAttribute('role', 'spinbutton');
    trays.setAttribute('aria-label', ctx.t('games.tenFrameCafe.trays'));
    // The ten frame fills left to right, as it is usually taught (BRIEF.md, localization).
    trays.dir = 'ltr';
    trays.tabIndex = 0;
    const total = element('p', 'g-ten-frame-cafe__total');
    const message = element('p', 'g-ten-frame-cafe__message');
    message.setAttribute('role', 'status');
    const controls = element('div', 'g-ten-frame-cafe__controls');
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', ctx.t('games.tenFrameCafe.controls'));
    container.append(order, instructions, trays, total, message, controls);
    root.append(container);

    let current: Order | undefined;
    /** Fill-to: fruit placed. Fill-up: fruit added. Making ten: fruit moved to the first tray. */
    let placed = 0;
    /** Making ten: the count the child has reached, once they start counting on. */
    let counted: number | undefined;
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

    const fruitPhrase = (count: number) =>
      current ? ctx.t(`games.tenFrameCafe.fruit.${current.fruit}`, { count }) : '';

    /** How many fruit each tray holds now. */
    function trayContents(): number[] {
      if (!current) return [];
      const { task, trays: given } = current.scene;
      const [first = 0, second = 0] = given;
      if (task === 'fill-to') {
        return given.map((_, index) => Math.min(TRAY, Math.max(0, placed - index * TRAY)));
      }
      if (task === 'fill-up') return [Math.min(TRAY, first + placed)];
      return [first + placed, second - placed];
    }

    /** Bonds to 10: fruit added past a full tray, on the counter beside it, to take away. */
    function spill(): number {
      if (current?.scene.task !== 'fill-up') return 0;
      const [first = 0] = current.scene.trays;
      return Math.max(0, first + placed - TRAY);
    }

    /** What the child would serve now: the number the item's answer is compared with. */
    function served(): number {
      if (!current) return 0;
      if (current.scene.task !== 'make-ten') return placed;
      return counted ?? trayContents()[0] ?? 0;
    }

    /** The most the child can add, or move, now. */
    function room(): number {
      if (!current) return 0;
      const { task, trays: given } = current.scene;
      const [first = 0, second = 0] = given;
      if (task === 'fill-to') return given.length * TRAY;
      // Past a full tray, fruit spills onto the counter, so too many can be served (the brief).
      if (task === 'fill-up') return TRAY;
      return Math.min(TRAY - first, second);
    }

    /** A placeholder fruit, a distinct shape for each kind, centred on a cell. */
    function fruitShape(fruit: Fruit, cx: number, cy: number, r: number = CELL.fruit) {
      const group = svg('g', {
        class: `g-ten-frame-cafe__fruit g-ten-frame-cafe__fruit--${fruit}`,
      });
      const shapes: Record<Fruit, () => SVGElement[]> = {
        apple: () => [
          svg('circle', { cx, cy: cy + 2, r }),
          svg('line', { x1: cx, y1: cy - r + 2, x2: cx + 4, y2: cy - r - 6, class: 'stem' }),
        ],
        pear: () => [
          svg('path', {
            d: `M ${String(cx)} ${String(cy - r)} C ${String(cx + 9)} ${String(cy - r)} ${String(cx + 8)} ${String(cy - 4)} ${String(cx + r - 2)} ${String(cy + 6)} C ${String(cx + r)} ${String(cy + r)} ${String(cx - r)} ${String(cy + r)} ${String(cx - r + 2)} ${String(cy + 6)} C ${String(cx - 8)} ${String(cy - 4)} ${String(cx - 9)} ${String(cy - r)} ${String(cx)} ${String(cy - r)} Z`,
          }),
        ],
        lemon: () => [svg('ellipse', { cx, cy, rx: r + 2, ry: r - 6 })],
        strawberry: () => [
          svg('path', {
            d: `M ${String(cx - r)} ${String(cy - r + 6)} Q ${String(cx)} ${String(cy - r - 4)} ${String(cx + r)} ${String(cy - r + 6)} Q ${String(cx + r - 4)} ${String(cy + 6)} ${String(cx)} ${String(cy + r)} Q ${String(cx - r + 4)} ${String(cy + 6)} ${String(cx - r)} ${String(cy - r + 6)} Z`,
          }),
        ],
      };
      group.append(...shapes[fruit]());
      return group;
    }

    /** One tray: its cells, its fruit, and in Practice how many it holds. */
    function drawTray(count: number, index: number) {
      const box = element('div', 'g-ten-frame-cafe__tray');
      const full = count === TRAY;
      if (full) box.classList.add('g-ten-frame-cafe__tray--full');
      const scene = svg('svg', {
        viewBox: `0 0 ${String(TRAY_WIDTH)} ${String(TRAY_HEIGHT)}`,
        'aria-hidden': 'true',
        focusable: 'false',
      });
      // In making ten, the hint marks the cells still to fill in the first tray.
      const toFill = current?.scene.task === 'make-ten' && index === 0;
      for (let cell = 0; cell < TRAY; cell += 1) {
        const x = CELL.gap + (cell % ROW) * (CELL.size + CELL.gap);
        const y = CELL.gap + Math.floor(cell / ROW) * (CELL.size + CELL.gap);
        const empty = cell >= count;
        const outlined = hinted && empty;
        scene.append(
          svg('rect', {
            class: [
              'g-ten-frame-cafe__cell',
              outlined ? 'g-ten-frame-cafe__cell--outlined' : '',
              outlined && toFill ? 'g-ten-frame-cafe__cell--to-fill' : '',
            ]
              .filter(Boolean)
              .join(' '),
            x,
            y,
            width: CELL.size,
            height: CELL.size,
            rx: CELL.radius,
          }),
        );
        if (!empty && current) {
          scene.append(fruitShape(current.fruit, x + CELL.size / 2, y + CELL.size / 2));
        }
      }
      box.append(scene);
      // The tray's count is shown in Practice, and hidden in Challenge (BRIEF.md).
      if (ctx.mode === 'practice') {
        const label = element('p', 'g-ten-frame-cafe__tray-count');
        label.textContent = ctx.t('games.tenFrameCafe.trayCount', { count });
        box.append(label);
      }
      return box;
    }

    /** The fruit spilt past a full tray, in a row on the counter, and in Practice how many. */
    function drawCounter(count: number) {
      const box = element('div', 'g-ten-frame-cafe__counter');
      const step = 2 * COUNTER.fruit + COUNTER.gap;
      const scene = svg('svg', {
        viewBox: `0 0 ${String(TRAY * step)} ${String(2 * COUNTER.fruit + COUNTER.gap)}`,
        'aria-hidden': 'true',
        focusable: 'false',
      });
      for (let index = 0; index < count && current; index += 1) {
        const centre = COUNTER.fruit + COUNTER.gap / 2;
        scene.append(fruitShape(current.fruit, index * step + centre, centre, COUNTER.fruit - 2));
      }
      box.append(scene);
      if (ctx.mode === 'practice') {
        const label = element('p', 'g-ten-frame-cafe__tray-count');
        label.textContent = ctx.t('games.tenFrameCafe.counter', { count });
        box.append(label);
      }
      return box;
    }

    function draw() {
      if (!current) return;
      const contents = trayContents();
      const spilt = spill();
      trays.replaceChildren(
        ...contents.map((count, index) => drawTray(count, index)),
        ...(spilt > 0 ? [drawCounter(spilt)] : []),
      );
      const { task } = current.scene;
      const [first = 0, second = 0] = contents;
      total.hidden = task !== 'make-ten';
      total.textContent = ctx.t('games.tenFrameCafe.total', { total: served() });
      const value =
        task === 'fill-to'
          ? ctx.t('games.tenFrameCafe.value.fillTo', { order: fruitPhrase(placed) })
          : task === 'fill-up'
            ? spilt > 0
              ? ctx.t('games.tenFrameCafe.value.fillUpSpill', { count: first, spill: spilt })
              : ctx.t('games.tenFrameCafe.value.fillUp', { count: first })
            : ctx.t('games.tenFrameCafe.value.makeTen', { first, second, total: served() });
      trays.setAttribute('aria-valuemin', '0');
      trays.setAttribute('aria-valuemax', String(task === 'make-ten' ? 2 * TRAY : room()));
      trays.setAttribute('aria-valuenow', String(served()));
      trays.setAttribute('aria-valuetext', value);
      updateControls();
    }

    const makeTen = () => current?.scene.task === 'make-ten';

    function updateControls() {
      const movable = canMove();
      trays.setAttribute('aria-disabled', String(!movable));
      moveButton.hidden = !makeTen();
      moveBackButton.hidden = !makeTen();
      moveButton.disabled = !movable || placed >= room();
      moveBackButton.disabled = !movable || placed <= 0;
      if (makeTen()) {
        takeAwayButton.disabled = !movable || served() <= 0;
        addButton.disabled = !movable || served() >= 2 * TRAY;
      } else {
        takeAwayButton.disabled = !movable || placed <= 0;
        addButton.disabled = !movable || placed >= room();
      }
      serveButton.disabled = !movable;
    }

    /** Fill-to and fill-up: a fruit into the trays, or out. Making ten: the count, up or down. */
    const add = () => {
      if (!canMove()) return;
      if (makeTen()) counted = Math.min(2 * TRAY, served() + 1);
      else placed = Math.min(room(), placed + 1);
      draw();
    };
    const takeAway = () => {
      if (!canMove()) return;
      if (makeTen()) counted = Math.max(0, served() - 1);
      else placed = Math.max(0, placed - 1);
      draw();
    };
    /** Making ten: a fruit from the second tray into the first, or back. */
    const move = (step: 1 | -1) => {
      if (!canMove() || !makeTen()) return;
      placed = Math.min(room(), Math.max(0, placed + step));
      // Moving starts the count again from the first tray.
      counted = undefined;
      draw();
    };
    const serve = () => {
      if (!canMove()) return;
      answering = false;
      updateControls();
      ctx.respond({ type: 'numeric', value: { kind: 'decimal', value: served() } });
    };

    const moveBackButton = button(
      'games.tenFrameCafe.moveBack',
      () => {
        move(-1);
      },
      'move-back',
    );
    const moveButton = button(
      'games.tenFrameCafe.move',
      () => {
        move(1);
      },
      'move',
    );
    const takeAwayButton = button('games.tenFrameCafe.takeAway', takeAway, 'take-away');
    const addButton = button('games.tenFrameCafe.add', add, 'add');
    const serveButton = button('games.tenFrameCafe.serve', serve, 'serve');
    controls.append(moveBackButton, moveButton, takeAwayButton, addButton, serveButton);
    trays.addEventListener('keydown', (event) => {
      const actions: Record<string, (() => void) | undefined> = {
        ArrowUp: add,
        '+': add,
        ArrowDown: takeAway,
        '-': takeAway,
        ArrowRight: () => {
          move(1);
        },
        ArrowLeft: () => {
          move(-1);
        },
        Enter: serve,
        ' ': serve,
      };
      const action = actions[event.key];
      if (!action) return;
      event.preventDefault();
      action();
    });

    /** The order as numbers, once it is answered or shown. */
    function sumText(): string {
      if (!current) return '';
      const { scene, answer } = current;
      const [first = 0, second = 0] = scene.trays;
      if (scene.task === 'fill-to') {
        return answer > TRAY
          ? ctx.t('games.tenFrameCafe.sum.fillToTen', { rest: answer - TRAY, count: answer })
          : ctx.t('games.tenFrameCafe.sum.fillTo', { count: answer });
      }
      if (scene.task === 'fill-up') {
        return ctx.t('games.tenFrameCafe.sum.fillUp', { shown: first, missing: answer });
      }
      return ctx.t('games.tenFrameCafe.sum.makeTen', { first, second, total: answer });
    }

    /** The sentence that says the answer, after the "show me" or in Challenge. */
    function answerText(): string {
      if (!current) return '';
      const { scene, answer } = current;
      const [first = 0] = scene.trays;
      if (scene.task === 'fill-to') {
        return answer > TRAY
          ? ctx.t('games.tenFrameCafe.answer.fillToTen', { rest: answer - TRAY, count: answer })
          : ctx.t('games.tenFrameCafe.answer.fillTo', { count: answer });
      }
      if (scene.task === 'fill-up') {
        return ctx.t('games.tenFrameCafe.answer.fillUp', { shown: first, missing: answer });
      }
      return ctx.t('games.tenFrameCafe.answer.makeTen', {
        first,
        moved: TRAY - first,
        rest: answer - TRAY,
        total: answer,
      });
    }

    /** The explanation a misconception triggers (BRIEF.md), if the game knows it. */
    const explanationFor = (result: GradeResult) => {
      if (!current || !isExplained(result.misconceptionId)) return undefined;
      const [first = 0] = current.scene.trays;
      return ctx.t(`games.tenFrameCafe.explanations.${result.misconceptionId}`, {
        shown: first,
        moved: TRAY - first,
      });
    };

    const showHint = () => {
      if (!current) return;
      hinted = true;
      const [first = 0] = current.scene.trays;
      message.textContent =
        current.scene.task === 'fill-up'
          ? spill() > 0
            ? ctx.t('games.tenFrameCafe.hintSpill')
            : ctx.t('games.tenFrameCafe.hintFill', { missing: TRAY - first - placed })
          : current.scene.task === 'make-ten'
            ? ctx.t('games.tenFrameCafe.hintMakeTen', { missing: TRAY - first - placed })
            : ctx.t('games.tenFrameCafe.hint');
      draw();
    };

    /** The right answer on the trays, and the order as numbers. */
    const reveal = () => {
      if (!current) return;
      revealed = true;
      const { scene, answer } = current;
      placed = scene.task === 'make-ten' ? room() : answer;
      counted = scene.task === 'make-ten' ? answer : undefined;
      order.textContent = sumText();
      draw();
    };

    /** The worked "show me": the café worker fills the trays one fruit at a time, counting. */
    async function showMe(explanation: string | undefined) {
      if (!current) return;
      demonstrating = true;
      const { scene, answer } = current;
      const [first = 0] = scene.trays;
      placed = 0;
      counted = undefined;
      message.textContent = ctx.t('games.tenFrameCafe.showMe');
      draw();
      await wait(TIMING.showMeStep);
      const steps = scene.task === 'make-ten' ? room() : answer;
      for (let step = 1; step <= steps && !destroyed; step += 1) {
        placed = step;
        draw();
        // Each count aloud: the fruit served, the tray filling to ten, or the first tray filling.
        const said = scene.task === 'fill-to' ? step : first + step;
        message.textContent = ctx.t('games.tenFrameCafe.showMeStep', { count: said });
        await wait(TIMING.showMeStep);
      }
      if (scene.task === 'make-ten') {
        // Then counting on from the full tray.
        for (let next = TRAY + 1; next <= answer && !destroyed; next += 1) {
          counted = next;
          draw();
          message.textContent = ctx.t('games.tenFrameCafe.showMeStep', { count: next });
          await wait(TIMING.showMeStep);
        }
      }
      reveal();
      message.textContent = explanation ?? answerText();
      await wait(TIMING.showMeEnd);
      demonstrating = false;
    }

    return {
      present({ item }) {
        if (item.type !== 'numeric' || item.scene?.kind !== 'ten-frame') {
          throw new Error(`${manifest.id} renders ten-frame numeric items, not ${item.type}`);
        }
        if (item.answer.kind !== 'decimal') throw new Error(`${item.id} has no whole answer`);
        const { scene } = item;
        if (!isFruit(scene.fruit)) throw new Error(`${item.id} has a fruit the café cannot draw`);
        current = { scene, fruit: scene.fruit, answer: item.answer.value };
        placed = 0;
        counted = undefined;
        revealed = false;
        hinted = false;
        demonstrating = false;
        answering = true;
        const [first = 0, second = 0] = scene.trays;
        order.textContent =
          scene.task === 'fill-to'
            ? ctx.t('games.tenFrameCafe.order.fillTo', { order: fruitPhrase(current.answer) })
            : scene.task === 'fill-up'
              ? ctx.t('games.tenFrameCafe.order.fillUp', { order: fruitPhrase(first) })
              : ctx.t('games.tenFrameCafe.order.makeTen', {
                  first: fruitPhrase(first),
                  second: fruitPhrase(second),
                });
        instructions.textContent = ctx.t(
          scene.task === 'fill-to'
            ? 'games.tenFrameCafe.instructions.fillTo'
            : scene.task === 'fill-up'
              ? 'games.tenFrameCafe.instructions.fillUp'
              : 'games.tenFrameCafe.instructions.makeTen',
        );
        message.textContent = '';
        draw();
        trays.focus();
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
          // Another try: the trays stay as the child left them, to fix (BRIEF.md).
          if (support === 'hint') showHint();
          message.textContent = explanation ?? ctx.t('games.tenFrameCafe.tryAgain');
          answering = true;
          draw();
          trays.focus();
          return;
        }
        if (support === 'worked-example') {
          await showMe(explanation);
          return;
        }
        // Challenge: one attempt, then the right order on the trays, without a lesson.
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
