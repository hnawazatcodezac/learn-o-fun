import type { GameModule } from '@learnofun/game-sdk';
import { manifest } from './manifest';
import './game.css';

/** A hint crosses out wrong answers, but always leaves at least this many to choose from. */
const MIN_CHOICES = 2;

/** Answers made only of digits and sums are set as numbers; anything else as words. */
const NUMBER = /^[\p{Nd}\p{Zs}+\-−=]+$/u;

/** One answer: the design system's AnswerTile, from the UI kit's shared classes (ADR 0020). */
interface Answer {
  tile: HTMLDivElement;
  button: HTMLButtonElement;
  state: HTMLSpanElement;
}

/**
 * A starter game: it shows a choice item's prompt and one answer tile per option, and reports the
 * child's choice. The chosen tile then says "Correct" or "Try again". Its hint crosses out a
 * wrong answer. Replace the mechanic with the one in BRIEF.md.
 */
export const game: GameModule = {
  manifest,
  mount(ctx, root) {
    const container = document.createElement('div');
    container.className = 'g-demo-choice';
    const instructions = document.createElement('p');
    instructions.className = 'g-demo-choice__instructions';
    instructions.textContent = ctx.t('games.demoChoice.instructions');
    const prompt = document.createElement('p');
    prompt.className = 'g-demo-choice__prompt';
    const group = document.createElement('div');
    group.className = 'g-demo-choice__answers';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', ctx.t('games.demoChoice.answers'));
    const hint = document.createElement('p');
    hint.className = 'g-demo-choice__hint';
    hint.setAttribute('role', 'status');
    container.append(instructions, prompt, group, hint);
    root.append(container);

    let answers: Answer[] = [];
    /** Wrong answers that a hint has not crossed out yet. */
    let wrong: Answer[] = [];
    let chosen: Answer | undefined;
    let paused = false;
    let answering = false;
    const crossedOut = (answer: Answer) => answer.tile.classList.contains('lf-answer--ruled-out');
    const update = () => {
      for (const answer of answers) {
        answer.button.disabled = paused || !answering || crossedOut(answer);
      }
    };
    const focusFirstAnswer = () => {
      answers.find((answer) => !answer.button.disabled)?.button.focus();
    };
    /** Shows a tile's result in colour, an icon and words: never colour alone. */
    const mark = (answer: Answer, result: 'correct' | 'try-again' | undefined) => {
      answer.tile.classList.remove('lf-answer--correct', 'lf-answer--try-again');
      answer.state.textContent = '';
      if (result === undefined) return;
      answer.tile.classList.add(`lf-answer--${result}`);
      answer.state.textContent = ctx.t(
        result === 'correct' ? 'ui.answer.correct' : 'ui.answer.tryAgain',
      );
    };

    /** Crosses out one wrong answer, picked with the seeded `ctx.rng`, if enough would remain. */
    const showHint = () => {
      const open = answers.filter((answer) => !crossedOut(answer));
      const answer =
        open.length > MIN_CHOICES && wrong.length > 0
          ? wrong.splice(ctx.rng.int(0, wrong.length - 1), 1)[0]
          : undefined;
      answer?.tile.classList.add('lf-answer--ruled-out');
      hint.textContent = ctx.t(
        answer ? 'games.demoChoice.hintCrossedOut' : 'games.demoChoice.hintLookAgain',
      );
      const hadFocus = answer !== undefined && answer.button === document.activeElement;
      update();
      if (hadFocus) focusFirstAnswer();
    };

    return {
      present({ item }) {
        if (item.type !== 'choice') {
          throw new Error(`${manifest.id} renders choice items, not ${item.type}`);
        }
        prompt.textContent = item.prompt ? ctx.localize(item.prompt) : '';
        hint.textContent = '';
        chosen = undefined;
        answers = item.options.map((option) => {
          const label = option.label ? ctx.localize(option.label) : '';
          const tile = document.createElement('div');
          tile.className = `lf-answer ${NUMBER.test(label) ? 'lf-answer--number' : 'lf-answer--word'}`;
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'lf-answer__tile';
          button.textContent = label;
          const state = document.createElement('span');
          state.className = 'lf-answer__state';
          tile.append(button, state);
          const answer: Answer = { tile, button, state };
          button.addEventListener('click', () => {
            for (const other of answers) mark(other, undefined);
            chosen = answer;
            answering = false;
            update();
            ctx.respond({ type: 'choice', optionIds: [option.id] });
          });
          return answer;
        });
        wrong = answers.filter((_answer, index) => {
          const option = item.options[index];
          return option !== undefined && !item.correctOptionIds.includes(option.id);
        });
        group.replaceChildren(...answers.map((answer) => answer.tile));
        answering = true;
        update();
        focusFirstAnswer();
        return Promise.resolve();
      },
      feedback(result, support) {
        if (chosen) mark(chosen, result.correct ? 'correct' : 'try-again');
        // Encouragement or a hint means another try at the same item.
        answering = support === 'encouragement' || support === 'hint';
        if (support === 'hint') showHint();
        update();
        if (answering) focusFirstAnswer();
        return Promise.resolve();
      },
      hint() {
        showHint();
        return Promise.resolve();
      },
      pause() {
        paused = true;
        update();
      },
      resume() {
        paused = false;
        update();
      },
      destroy() {
        container.remove();
      },
    };
  },
};
