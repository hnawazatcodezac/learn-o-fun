import AxeBuilder from '@axe-core/playwright';
import { loadGames } from '../src/games';
import { lifecycleProblems } from '../src/lifecycle';
import {
  VIEWPORTS,
  WCAG_22_AA,
  expect,
  hardCodedText,
  overflowProblems,
  playThrough,
  setVisibility,
  shell,
  tabInto,
  test,
  waitForEvent,
} from './helpers';

/**
 * The conformance suite in the game shell (plan 6.8, ADR 0014): every registered game, every
 * story, played with the game's own keyboard driver.
 */
const games = await loadGames();

for (const game of games) {
  for (const story of game.stories) {
    const completed = {
      gameId: game.manifest.id,
      gameVersion: game.manifest.version,
      itemIds: story.items.map((item) => item.id),
      completed: true,
    };
    const firstItem = (id: string) => {
      const item = story.items.find((candidate) => candidate.id === id);
      if (!item) throw new Error(`Item ${id} is not in story ${story.id}`);
      return item;
    };

    test.describe(`${game.id} · ${story.id} · shell`, () => {
      test('plays through with the keyboard, with well-formed learning events', async ({
        page,
      }) => {
        await page.goto(shell.url(game, story));

        const events = await playThrough(page, shell, game, story);

        expect(lifecycleProblems(events, completed)).toEqual([]);
        // The game removes itself when the session is over.
        await expect(shell.stage(page).locator('*')).toHaveCount(0);
      });

      if ((story.mode ?? 'practice') === 'practice') {
        test('takes another answer after a wrong one', async ({ page }) => {
          await page.goto(shell.url(game, story));
          const item = firstItem((await waitForEvent(page, shell, 'item_presented')).itemId);

          await game.answer(shell.stage(page), item, false);
          await waitForEvent(page, shell, 'response_submitted');
          await game.answer(shell.stage(page), item, true);

          const second = await waitForEvent(page, shell, 'response_submitted', 2);
          expect(second).toMatchObject({ itemId: item.id, attempt: 2 });
        });

        test('shows a hint the child asks for, and still takes the answer', async ({ page }) => {
          await page.goto(shell.url(game, story));
          const item = firstItem((await waitForEvent(page, shell, 'item_presented')).itemId);

          await page.getByRole('button', { name: 'Hint' }).click();
          expect(await waitForEvent(page, shell, 'hint_shown')).toMatchObject({
            itemId: item.id,
            level: 1,
          });
          await game.answer(shell.stage(page), item, true);

          expect(await waitForEvent(page, shell, 'response_submitted')).toMatchObject({
            itemId: item.id,
            support: 'hint',
          });
        });
      }

      test('plays Challenge mode: one attempt per item and no hints', async ({ page }) => {
        await page.goto(shell.url(game, story, { mode: 'challenge' }));

        const events = await playThrough(page, shell, game, story, { correct: false });

        expect(lifecycleProblems(events, completed)).toEqual([]);
        const responses = events.filter((event) => event.type === 'response_submitted');
        const presented = events.filter((event) => event.type === 'item_presented');
        expect(responses).toHaveLength(presented.length);
        expect(events.filter((event) => event.type === 'hint_shown')).toEqual([]);
      });

      test('ignores input while paused, and takes it again after resuming', async ({ page }) => {
        await page.goto(shell.url(game, story));
        const item = firstItem((await waitForEvent(page, shell, 'item_presented')).itemId);

        await setVisibility(page, 'hidden');
        await waitForEvent(page, shell, 'session_paused');
        // The answer may be unreachable or ignored; either way, no answer may be recorded.
        await game.answer(shell.stage(page), item, true).catch(() => undefined);
        const whilePaused = await shell.events(page);
        expect(whilePaused.filter((event) => event.type === 'response_submitted')).toEqual([]);

        await setVisibility(page, 'visible');
        await waitForEvent(page, shell, 'session_resumed');
        await page.keyboard.press('Escape');
        await game.answer(shell.stage(page), item, true);
        expect(await waitForEvent(page, shell, 'response_submitted')).toMatchObject({
          itemId: item.id,
        });
      });

      for (const viewport of VIEWPORTS) {
        for (const locale of ['en', 'en-XA']) {
          const size = `${String(viewport.width)}×${String(viewport.height)}`;
          test(`fits ${size} in ${locale}, on every item`, async ({ page }) => {
            await page.setViewportSize(viewport);
            await page.goto(shell.url(game, story, { locale }));

            const events = await playThrough(page, shell, game, story, {
              beforeAnswer: async (item) => {
                expect(await overflowProblems(page), item.id).toEqual([]);
                if (locale === 'en-XA') {
                  expect(await hardCodedText(page.getByTestId('game-shell')), item.id).toEqual([]);
                }
              },
            });

            expect(lifecycleProblems(events, completed)).toEqual([]);
          });
        }
      }

      test('survives a rotation in the middle of an item', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto(shell.url(game, story));
        await waitForEvent(page, shell, 'item_presented');

        await page.setViewportSize({ width: 1024, height: 768 });
        const events = await playThrough(page, shell, game, story);

        expect(lifecycleProblems(events, completed)).toEqual([]);
      });

      test('works right to left (en-XB), at the smallest size', async ({ page }) => {
        await page.setViewportSize({ width: 360, height: 640 });
        await page.goto(shell.url(game, story, { locale: 'en-XB' }));
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

        const events = await playThrough(page, shell, game, story, {
          beforeAnswer: async (item) => {
            expect(await overflowProblems(page), item.id).toEqual([]);
          },
        });

        expect(lifecycleProblems(events, completed)).toEqual([]);
      });

      test('shows where keyboard focus is inside the game', async ({ page }) => {
        await page.goto(shell.url(game, story));
        await waitForEvent(page, shell, 'item_presented');

        expect(await tabInto(page, shell.stage(page))).toBe(true);

        const focus = await page.evaluate(() => {
          const element = document.activeElement;
          if (!element) return { outline: false, shadow: false };
          const style = getComputedStyle(element);
          return {
            outline: style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0,
            shadow: style.boxShadow !== 'none',
          };
        });
        expect(focus.outline || focus.shadow, 'a visible focus indicator').toBe(true);
      });

      test('meets WCAG 2.2 AA', async ({ page }) => {
        await page.goto(shell.url(game, story));
        await waitForEvent(page, shell, 'item_presented');

        const { violations } = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();

        expect(violations.map((v) => `${v.id}: ${v.help} (${String(v.nodes.length)})`)).toEqual([]);
      });
    });
  }
}
