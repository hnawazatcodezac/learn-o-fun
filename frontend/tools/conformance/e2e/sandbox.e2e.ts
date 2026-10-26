import { loadGames } from '../src/games';
import { lifecycleProblems } from '../src/lifecycle';
import { expect, playThrough, runningAnimations, sandbox, test } from './helpers';

/**
 * The conformance checks that need the game sandbox (ADR 0014): it watches the game for message
 * keys and signals its manifest does not declare, and lets the suite turn on reduced motion.
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

    test.describe(`${game.id} · ${story.id} · sandbox`, () => {
      test('plays through with nothing on the Problems list', async ({ page }) => {
        await page.goto(sandbox.url(game, story));

        const events = await playThrough(page, sandbox, game, story);

        expect(lifecycleProblems(events, completed)).toEqual([]);
        await expect(page.getByTestId('problems')).toHaveCount(0);
      });

      test('runs no animations under reduced motion', async ({ page }) => {
        await page.goto(sandbox.url(game, story, { motion: 'reduced' }));
        await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
        const stage = sandbox.stage(page);

        const events = await playThrough(page, sandbox, game, story, {
          beforeAnswer: async (item) => {
            expect(await runningAnimations(stage), item.id).toEqual([]);
          },
          afterAnswer: async (item) => {
            expect(await runningAnimations(stage), item.id).toEqual([]);
          },
        });

        expect(lifecycleProblems(events, completed)).toEqual([]);
      });
    });
  }
}
