import type { Item } from '@learnofun/contracts';
import type { Locator } from '@playwright/test';

/** More Tab presses than this means the trays cannot be reached by keyboard. */
const MAX_TABS = 60;

/**
 * How the conformance suite answers the item on screen, with the keyboard only (ADR 0014): Tab
 * to the trays, add fruit with the Up arrow and serve with Enter. In making ten, the Right arrow
 * moves fruit into the first tray, then Up counts on from ten. A wrong answer is one short.
 */
export async function answer(stage: Locator, item: Item, correct: boolean): Promise<void> {
  if (
    item.type !== 'numeric' ||
    item.scene?.kind !== 'ten-frame' ||
    item.answer.kind !== 'decimal'
  ) {
    throw new Error(`ten-frame-cafe answers ten-frame numbers, not ${item.type}`);
  }
  const { scene } = item;
  const goal = correct ? item.answer.value : item.answer.value - 1;
  const trays = stage.getByRole('spinbutton');
  const keyboard = stage.page().keyboard;

  let reached = false;
  for (let presses = 0; presses < MAX_TABS && !reached; presses += 1) {
    reached = await trays.evaluate((element) => element === document.activeElement);
    if (!reached) await keyboard.press('Tab');
  }
  if (!reached) throw new Error(`The trays for ${item.id} cannot be reached with Tab`);

  const press = async (key: string, times: number) => {
    for (let count = 0; count < times; count += 1) await keyboard.press(key);
  };
  if (scene.task === 'make-ten') {
    const [first = 0] = scene.trays;
    await press('ArrowRight', 10 - first);
  }
  // Up from where the count is now: a retried item keeps what the child left (BRIEF.md).
  const now = Number(await trays.getAttribute('aria-valuenow'));
  await press(goal > now ? 'ArrowUp' : 'ArrowDown', Math.abs(goal - now));
  await keyboard.press('Enter');
}
