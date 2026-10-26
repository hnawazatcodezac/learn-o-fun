# ActivityCard

A card on the child's Today screen that starts one activity.

**Provide:** the kind (Review, New skill or Your choice), the activity title, an approximate length in minutes, art for the top band, and the spoken title.

- `surface-raised` with a `line` border, `radius-lg` and `shadow-sm`. The whole card is one tap target.
- The art band uses one brand fill: `coral` for Review, `sun` for New skill and `sky` for Your choice. Until final illustrations exist, compose it from pebbles and discs in `surface-raised`, `leaf`, `navy` and `sun`.
- The kicker chip pairs each kind with its soft tint and ink: `coral-soft`/`coral-ink`, `sun-soft`/`sun-ink`, `sky-soft`/`sky-ink`.
- Title in `play-label`, length in `ink-muted`.
- Today always shows exactly three cards, in the order Review, New skill, Your choice.

**Don't:** show scores, stars earned, prices or a lock on a child's card. Content the family cannot use is simply not shown.
