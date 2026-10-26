import type { Item } from '@learnofun/contracts';
import type { Locator } from '@playwright/test';

/** More Tab presses than this means the answer cannot be reached by keyboard. */
const MAX_TABS = 60;

/**
 * How the conformance suite answers the item on screen, with the keyboard only (ADR 0014): Tab
 * to a right or a wrong answer and press Enter. `stage` is the element the game is mounted in.
 * Change it when the game's controls change.
 */
export async function answer(stage: Locator, item: Item, correct: boolean): Promise<void> {
  if (item.type !== 'choice') throw new Error(`demo-choice answers choice items, not ${item.type}`);
  const buttons = stage.getByRole('group').getByRole('button');
  // The answer buttons follow the item's options, in order; a crossed-out answer is disabled.
  let target: Locator | undefined;
  for (const [index, option] of item.options.entries()) {
    const button = buttons.nth(index);
    if (item.correctOptionIds.includes(option.id) === correct && (await button.isEnabled())) {
      target = button;
      break;
    }
  }
  if (!target) throw new Error(`Item ${item.id} has no ${correct ? 'right' : 'wrong'} answer left`);

  const keyboard = stage.page().keyboard;
  for (let presses = 0; presses < MAX_TABS; presses += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) {
      await keyboard.press('Enter');
      return;
    }
    await keyboard.press('Tab');
  }
  throw new Error(`The answer to ${item.id} cannot be reached with the Tab key`);
}
