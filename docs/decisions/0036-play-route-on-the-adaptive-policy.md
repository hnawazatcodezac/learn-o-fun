# 0036. The play route on the adaptive policy

- Status: accepted
- Date: 2026-10-23
- Plan section: 4.2, 4.3; FRONTEND-KICKOFF step 13d; builds on ADR 0022, ADR 0023, ADR 0032, ADR 0035

## Context

Step 13d puts the play route on plan 4.2's in-session policy (ADR 0032), with items made on demand. Two readings were open. A Hop Line activity practises two skills (adding within 10 and within 20), and the policy starts from one ability. And the policy can offer a break when the child seems to have drifted, but the shell has only its break reminder (ADR 0022).

## Options considered

1. **Where the policy starts:** the ability on the skill Today's card named, else on the first of the activity's skills the child has begun / always the activity's first skill / the skill the child is least sure of.
2. **An offered break:** the break reminder's own screen / a screen of its own.

## Decision

The first option each time, since the planner chose the card's skill on purpose, and the break reminder already pauses and carries on as plan 4.2 asks.

- **A catalog activity plays the adaptive policy** (`adaptive-1`). Its items are made on demand by `templateMaker` from the activity's template. Game stories, the sandbox and the conformance suite keep their fixed lists and the placeholder.
- **The session aims at the skill Today's card named**, which the card passes as `?skill=`. From the library, where no card names one, it aims at the first of the activity's skills the child has begun, else at the activity's first skill. The child's ability on that skill, from the snapshot's skill states, is where the policy starts. A skill not begun starts from the learner model's own values. The engine keeps the ability up to date during the session.
- **An offered break is the break reminder's screen, with its own words.** The session pauses for `break` and carries on when the child chooses, or stops for now. It comes at most once a session, never as a penalty, and not once time is up. Its words say nothing about time played ("Let's take a little break. Stretch, then choose."), since it can come after a single quick wrong answer; the reminder's own words stay for the reminder.
- **A saved session carries on with the items made so far** (ADR 0023), so a refresh never changes what the child saw.

## Consequences

- Hop Line adapts to each child's evidence, session by session and item by item.
- The human's play-through of Hop Line is the step's last check.
