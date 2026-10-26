import { Item, type ExperienceBand } from '@learnofun/contracts';
import type { GameStory } from '@learnofun/game-sdk';

/** A choice item: a prompt, three options and the index of the correct one. */
function choice(id: string, prompt: string, options: [string, string, string], correct: number) {
  return Item.parse({
    id,
    type: 'choice',
    skillIds: ['add-within-10'],
    difficulty: 0,
    prompt: { en: prompt },
    options: options.map((label, index) => ({
      id: `option-${String(index)}`,
      label: { en: label },
    })),
    correctOptionIds: [`option-${String(correct)}`],
    multiple: false,
  });
}

function story(band: ExperienceBand, title: string, items: Item[]): GameStory {
  return { id: band, title, band, items };
}

/** Items to try the game with, one story per experience band (`.claude/rules/games.md`). */
export const stories: readonly GameStory[] = [
  story('early-years', 'Ages 3–5: adding to 5', [
    choice('demo-choice-ey-1', '1 + 1', ['1', '2', '3'], 1),
    choice('demo-choice-ey-2', '2 + 1', ['3', '4', '2'], 0),
    choice('demo-choice-ey-3', '2 + 2', ['3', '5', '4'], 2),
  ]),
  story('early-primary', 'Ages 6–8: adding to 10', [
    choice('demo-choice-ep-1', '3 + 4', ['6', '7', '8'], 1),
    choice('demo-choice-ep-2', '5 + 5', ['10', '9', '11'], 0),
    choice('demo-choice-ep-3', '6 + 2', ['7', '9', '8'], 2),
  ]),
];
