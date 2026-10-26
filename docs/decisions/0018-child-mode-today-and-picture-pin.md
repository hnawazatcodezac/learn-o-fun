# 0018. Child mode: what Today shows, and the picture PIN

- Status: accepted
- Date: 2026-10-21
- Plan section: 1 (journeys; what children never see), 4.3 (Today), 8.1 (child mode, picture PIN, parental gate)

## Context

FRONTEND-KICKOFF step 9 builds child mode: the profile picker, Today and the activity library. Two things are not decided in the plan.

1. **Today and unbuilt games.** The mock Today cards point at Ten Frame Café activities, whose game arrives in step 14; only Hop Line can be played now. The plan says Today has three cards, and that children never see locked content.
2. **The picture PIN.** Plan 8.1 says siblings sharing a device can each add a picture PIN, but not who sets it, how long it is, or where it is kept.

## Options considered

Today: show only playable cards; repoint the mock cards at Hop Line; or show unplayable cards as "coming soon".

Picture PIN: a grown-up sets it, three pictures; the child picks their own; or leave it out for now.

## Decision

The team chose:

- **Today shows only the cards a child can play.** A card is hidden when its game is not built, its activity has no template, it does not suit the child's band, or the family's plan does not include its tier. Today shows one to three cards until step 14 adds the games. The activity library follows the same rule. This also holds in production: a child never sees a card they cannot play, and upgrades are offered to parents only (plan 4.3).
- **A grown-up sets the picture PIN: three pictures from nine.** It is set or cleared in the child's settings, behind the parental gate, and saved with the child's settings, so it applies on every device. The profile picker asks for it before opening the profile; a forgotten PIN is cleared by a grown-up. The device checks a PIN by asking the API, so it never receives a sibling's PIN.

## Consequences

- `ChildSettings` gains an optional `picturePin`, the device's profile list says only whether a profile has one, and a new endpoint checks an entered PIN.
- The child's snapshot carries the activity tier the family's plan includes, so the device can hide what the child cannot play without seeing billing.
- Opening a PIN-protected profile needs the API; working offline (steps 9c and 9d: the outbox, and the app cached on the device) keeps the last chosen child open on that device.

## Amendment, 2026-10-21

The design system's ActivityCard spec says Today always shows exactly three cards, in the order Review, New skill, Your choice. The team kept this ADR's rule until FRONTEND-KICKOFF step 14: Today shows only playable cards, in that order, so one to three. Once three games exist, the planner fills all three and the design system's rule holds (ADR 0019).
