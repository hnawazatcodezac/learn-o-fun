import type { Item } from '@learnofun/contracts';
import type { Locator } from '@playwright/test';

/** More Tab presses than this means the number line cannot be reached by keyboard. */
const MAX_TABS = 60;

/**
 * How the conformance suite answers the item on screen, with the keyboard only (ADR 0014): Tab
 * to the number line, hop the frog with the arrow keys and land it with Enter. A wrong answer
 * lands one short, or one past when one short would be off the line.
 */
export async function answer(stage: Locator, item: Item, correct: boolean): Promise<void> {
  if (item.type !== 'placement' || item.surface.kind !== 'line') {
    throw new Error(`hop-line answers placements on a line, not ${item.type}`);
  }
  const { target, min } = item.surface;
  const goal = correct ? target : target - 1 >= min ? target - 1 : target + 1;
  const line = stage.getByRole('slider');
  const keyboard = stage.page().keyboard;

  let reached = false;
  for (let presses = 0; presses < MAX_TABS && !reached; presses += 1) {
    reached = await line.evaluate((element) => element === document.activeElement);
    if (!reached) await keyboard.press('Tab');
  }
  if (!reached) throw new Error(`The number line for ${item.id} cannot be reached with Tab`);

  const now = Number(await line.getAttribute('aria-valuenow'));
  const key = goal > now ? 'ArrowRight' : 'ArrowLeft';
  for (let hops = 0; hops < Math.abs(goal - now); hops += 1) await keyboard.press(key);
  await keyboard.press('Enter');
}
