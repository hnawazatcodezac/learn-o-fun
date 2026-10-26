# @learnofun/game-hop-line

**Hop Line** (`BRIEF.md`, approved 2026-10-21): the frog starts on the first number of a sum, the child hops it forward one number at a time and lands it on the answer. This first activity is addition within 20 for ages 6–8 (`hop-line-add-within-20`).

- `src/manifest.ts`: what the game is and can do (plan 6.2), and the misconceptions it explains.
- `src/game.ts`: the `GameModule`. The number line is drawn in SVG, with a placeholder frog until the art is made.
  - **Controls:** Hop, Back and Land buttons; on the number line itself, the arrow keys hop, Home goes back to the start, and Enter or Space lands. Tapping the frog also hops. Screen readers hear "Frog on 5, 2 hops".
  - **Practice:** a hop counter; a wrong answer sends the frog back to the start with an explanation of the misconception it points to, or "Count the hops again".
  - **Hint** (the shell's hint button, or the second wrong answer): footprints for the hops to make, which fill in as the frog hops, and every number labelled.
  - **Worked "show me"** (the third wrong answer): the frog hops by itself, saying each number it lands on, then shows the sum.
  - **Challenge:** no hop counter and no hints; after a wrong answer the frog shows the right landing number.
  - The number line never mirrors right to left (plan 7.2), and the frog's hop follows the motion setting.
- `src/stories.ts`: a six-item session from the `hop-line-addition` template, easiest to hardest, for the game sandbox and the conformance suite.
- `conformance/`: what the conformance suite needs (ADR 0014). `answer()` hops the frog with the arrow keys and lands it with Enter.
- Interface text is under `games.hopLine` in the English catalog. There is no audio yet; the voice lines in the brief arrive with the shell's audio manager.

Rules in `.claude/rules/games.md`.
