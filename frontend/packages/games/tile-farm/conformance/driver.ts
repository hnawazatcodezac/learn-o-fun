import type { Item } from '@learnofun/contracts';
import type { Locator } from '@playwright/test';

/** More Tab presses than this means the field cannot be reached by keyboard. */
const MAX_TABS = 60;
/** The most rows a field holds: digging up this many clears any field. */
const MAX_ROWS = 10;

/**
 * How the conformance suite answers the item on screen, with the keyboard only (ADR 0014): Tab
 * to the field, clear it with the Down arrow and plant the rows asked for with Up, then count
 * single plants with + and − and give the count with Enter. Counting one by one works in both
 * modes; Challenge has no Add a row. A wrong answer is one short.
 */
export async function answer(stage: Locator, item: Item, correct: boolean): Promise<void> {
  if (item.type !== 'numeric' || item.scene?.kind !== 'field' || item.answer.kind !== 'decimal') {
    throw new Error(`tile-farm answers field numbers, not ${item.type}`);
  }
  const { scene } = item;
  const goal = correct ? item.answer.value : item.answer.value - 1;
  const field = stage.getByRole('spinbutton');
  const keyboard = stage.page().keyboard;

  let reached = false;
  for (let presses = 0; presses < MAX_TABS && !reached; presses += 1) {
    reached = await field.evaluate((element) => element === document.activeElement);
    if (!reached) await keyboard.press('Tab');
  }
  if (!reached) throw new Error(`The field for ${item.id} cannot be reached with Tab`);

  const press = async (key: string, times: number) => {
    for (let count = 0; count < times; count += 1) await keyboard.press(key);
  };
  // A retried item keeps the field and the count the child left (BRIEF.md).
  await press('ArrowDown', MAX_ROWS);
  await press('ArrowUp', scene.rows);
  const now = Number(await field.getAttribute('aria-valuenow'));
  await press(goal > now ? '+' : '-', Math.abs(goal - now));
  await keyboard.press('Enter');
}
