# 0035. The planner for Today

- Status: accepted
- Date: 2026-10-23
- Plan section: 4.3, 4.4; FRONTEND-KICKOFF step 13c; builds on ADR 0018, ADR 0027, ADR 0028, ADR 0032

## Context

Step 13c replaces Today's fixture cards with plan 4.3's planner, as ADR 0032 decided: pure, in `learning-core`, run by the mock API for now; only activities the child can play here; a favourite for "Your choice". Three things were still open. Which games are built is known only to the app's game registry, yet the planner runs in the mock API. Hop Line, the one built game, has only two activities, one of them still without an item template, so there are fewer playable activities than Today's three cards. And plan 4.3 does not say what the review card holds when no review is due.

## Options considered

1. **Which games are built:** the catalog's release lists its games / the device sends its game list with the request.
2. **Too few activities:** fewer cards / the same activity on two cards.
3. **No review due:** a skill still building / no review card.

## Decision

The first option each time, as the team chose.

- **The release lists its games.** `CatalogResponse.games` names the games a content release includes (today `hop-line`). The planner plans only their activities, so the child's Today and the parent's explanations always agree. The catalog still lists other games' activities, which past sessions name. The app plays an activity only if its game is in the release and in the app (`not-in-release`, then `game-not-built`).
- **"Can play here"** is judged as the app judges it: the game in the release, the activity for the child's band, its tier on the family's plan, and a template to make its items from.
- **Fewer cards.** Each card has its own activity. When the activities run out, Today has fewer cards; it can have none. `TodayResponse` takes at most one card of each kind, in order (review, new, free choice), and no activity on two cards. While Hop Line's addition is the only activity with items, each child has one card.
- **The review card** takes a review that is due; else the best skill still being built (KEEP_BUILDING) or a prerequisite to support (PREREQ_SUPPORT); else the next-best skill.

**The planner** (`planToday`, version `planner-1`; every number in `PlannerConfig`, the same for both bands until a learning designer sets them):

- **Candidates** (plan 4.3): reviews due, scored 3, plus 0.1 a day overdue for up to 14 days. Skills Exploring, Building or Strong (KEEP_BUILDING), scored 2 plus predicted success at the mastery difficulty. Frontier skills: not started, with every prerequisite Strong or Mastered (FRONTIER_READY), scored 2 plus the weakest prerequisite's predicted success, and building on the one the child is surest of. A skill with no prerequisite is a first step, and the dashboard says so. A prerequisite not yet Strong of a skill that has stayed hard: still Building after 3 sessions on 2 days, or ended by the loop guard in the last 7 days (PREREQ_SUPPORT, scored 3).
- **Scores also weigh** a parent's goal (+2, and the PARENT_GOAL reason), the subject's share of the parent's balance (+1 × share), variety (−0.5 for a subject already on Today), recency (−1 for a skill practised today), and favourites (+0.5 × the game's share of the last 14 days' finished sessions).
- **Constraints:** a subject set to 0% is never planned, "Your choice" included. Ages 3 to 5 start at most one new skill a day. Entitlements come through the activities the child can play.
- **Activities:** for each skill, a playable activity not already on Today, preferring a game the child has not used for that skill lately.
- **Cards**, in order: the review card, then the new card (a frontier skill, else the next-best skill), then "Your choice": the activity the child finished most in the last 14 days and not already on Today, else any other they can play.

**The mock API plans Today on every request** from the events, so it changes after each session. A card's ID is seeded by the child, the day and what the card holds, so it keeps its ID while it stays the same. The fixture recommendations are gone from the data file.

## Consequences

- Today follows each child's evidence, and the dashboard explains it from the same cards.
- With one playable activity, Today is a single card. It fills out as step 14's games arrive, and FREE_CHOICE, FRONTIER_READY and PREREQ_SUPPORT then appear in the mock children's Today again. Until then the planner's unit tests cover them.
- PLACEMENT_GAP waits for placement (plan 4.3).
- Revisit the weights with real data, and per band once a learning designer has set them.
