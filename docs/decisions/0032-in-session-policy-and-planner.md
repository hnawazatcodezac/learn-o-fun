# 0032. The in-session policy and the planner

- Status: accepted; the steps amended by ADR 0033; the planner's open points decided in ADR 0035
- Date: 2026-10-22
- Plan section: 4.2, 4.3, 4.4, 4.6; FRONTEND-KICKOFF step 13; builds on ADR 0022, ADR 0031

## Context

Step 13 replaces the placeholder policy with plan 4.2's in-session policy, builds plan 4.3's planner for Today, and makes the simulator's three policy gates required (ADR 0031). Plan 4.2 and 4.3 describe the rules; three choices were open: how the policy gets items of the difficulty it wants, what the planner does while most recommended skills are practised by games not yet built, and how Today's free-choice card is chosen.

## Options considered

1. **Items:** made on demand at the level the policy chooses / a pool made at the start.
2. **Planner and unbuilt games:** only activities the child can play here / the best skill whatever its activity, hidden in child mode.
3. **Free choice:** a favourite / something not played lately.

## Decision

The first option each time, as the team chose.

- **Items are made on demand.** A session is played from an item source: a template with its levels, made by the seeded generators (ADR 0015), or a fixed list, as a game's stories are. For a template, the policy chooses a level and the engine makes the item there and then, seeded from the session, never repeating one within the session but for the planned re-ask. The items made so far are saved with the session (ADR 0023), so a refresh still carries on exactly. A fixed list is played in order, as before.
- **The policy follows plan 4.2**, its numbers in a typed config:
  - it starts at the level whose predicted success, from the child's ability (ADR 0031), sits in the success zone for the mode and band (0.80–0.90 Practice ages 3–5, 0.70–0.85 Practice ages 6–8, 0.60–0.80 Challenge), and keeps the ability up to date within the session;
  - it changes level only on windows: up after 3 of the last 4 right first time, down after 2 errors in a row or 3 of the last 5 wrong, with at least 2 items between changes (DIFFICULTY_STEP);
  - the support ladder per item stays as it is: a retry, a hint, then "show me";
  - after 2 supported items in a row, a scaffold item at the easiest level, then a bridge item a level below, then back to the target;
  - a missed item is asked again once, 2 or 3 items later (role `re-ask`, which earns learning credit, not mastery);
  - no more than 3 scaffolds in a row or 30% of a session; if first-try accuracy stays under 40% after scaffolding, the session ends on an easy success and the skill is flagged for the planner;
  - wrong answers faster than plausible reading time, 2 skips in a row, or a long idle offer a break with the shell's own break screen, never a penalty;
  - the session shape of ADR 0022: warm-ups at an easy level, the core, and an easy item to end on a success.
- **The planner** (plan 4.3) is pure, in `learning-core`, and runs in the mock API for now. It gathers candidates (reviews due, frontier skills, skills still building, skills in a parent goal), scores them with weights per band, applies the subject balance, at most one new skill a day for ages 3 to 5, and the family's entitlements, and fills Today's three cards: review, new or frontier, and free choice. Each card is an activity the child can play here: its game built and its tier on the plan. A card with no playable activity goes to the next-best skill.
- **"Your choice" is a favourite:** the playable activity the child finished most often in the last 14 days and not already on Today, or any playable one if there is none.
- Every decision carries its reason code and the evidence behind it, which the dashboard explains (ADR 0028).

**How 13a reads plan 4.2's rules** (`createAdaptivePolicy`, version `adaptive-1`; every number in `AdaptiveConfig`):

- The windows count first tries on the target: target items and missed items asked again, so "back to the target level after three correct" (plan 4.4) holds. A skipped item is left out. The window gives the direction; the child's ability, kept up to date, how far: at least one level, or as far as the zone now is.
- "At least 2 items between changes" counts answers on the target since the level changed.
- A missed item is asked again once, after 2 or 3 other items, never straight after another re-ask; one missed earlier than that is let go.
- The bridge sits one level below where the target goes next.
- After the first scaffold, if first-try accuracy over at least 3 items stays under 40%, the session ends on an easy success with LOOP_GUARD and the end reason `activity-switched`, which the planner reads as the skill's flag.
- A break is offered once a session, at the first sign of drifting: a wrong answer in under 1.5 seconds, 2 skips in a row, or an answer after more than a minute.
- Warm-ups and the items to end on are at the hardest level still predicted at least 0.9.
- A fixed list (a game's stories, the sandbox) is played in order, as the placeholder played it, with the same support ladder.

**Step 13 is built in four parts** (amended by ADR 0033): 13a the policy, with the scaffold-loop and error-streak gates required; 13b a learner model that can follow a child who is learning, so the success-zone gate passes; 13c the planner; 13d the play route on the new policy and the human's play-through of Hop Line.

## Consequences

- Sessions follow plan 4.2's rules, and the simulator measures them before any child plays. How closely they fit each child waits on step 13b's learner model (ADR 0033).
- A saved session keeps every item made so far, so resuming never changes what the child saw.
- The fixed-list path stays for game stories and the sandbox.
