# 0012. Leaving a game, and the smallest screens games must fit

- Status: accepted
- Date: 2026-10-20
- Plan section: 6.1 (game shell), 6.7 (definition of done), 8.1 (parental gate), 8.7 (healthy use), 10.1 (platforms)

## Context

Plan 6.1 lists "exit through the parental gate" among the game shell's parts, while plan 8.1 puts the gate before settings, purchases, external links and leaving child mode. The conformance suite (plan 6.8) checks a "minimum viewport", which the plan does not define; plan 10.1 targets tablets and laptops for the first release.

## Options considered

Leaving a game:

1. Children leave a game freely, back to their Today screen, staying in child mode. Settings and leaving child mode still need the gate.
2. Any exit from a game needs the gate.

Smallest screens:

1. Tablets and laptops: 1024×600 landscape and 768×1024 portrait.
2. The same, plus phones: 360×640.

## Decision

The team's choices:

- **Children leave a game freely.** The pause menu offers "back to my games" with no gate. The parental gate stands before settings and leaving child mode (CLAUDE.md rule 6), and plan 6.1's "exit through the parental gate" means leaving the child area.
- **Phones too.** Every game must fit, without overflow, at 1024×600, 768×1024 and 360×640. The conformance suite checks all three.

## Consequences

- A child who wants to stop is never stuck in a game, which supports healthy use (plan 8.7).
- Every game layout must also work on a small phone: more design work per game, and a check on each one.
- Revisit the phone size if the launch market's devices turn out to be different (plan 12.1).
