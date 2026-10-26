# SkillStatus

A chip that tells a parent where a child is with one skill.

**Provide:** the status from the learner model, and the reason text the dashboard shows beside it.

| Status | Tint and ink | Icon |
| --- | --- | --- |
| Not started | `surface-sunken`, `ink-muted` | empty circle |
| Exploring | `sky-soft`, `sky-ink` | quarter circle |
| Building | `sun-soft`, `sun-ink` | half circle |
| Strong | `teal-soft`, `teal-ink` | three-quarter circle |
| Mastered | `leaf-soft`, `leaf-ink` | full circle with a check |
| Review due | `coral-soft`, `coral-ink` | loop arrow |

- A pill in `radius-full`, `family-small` text at weight 500, with a 16px icon. The icon and the word carry the meaning, so it works without colour.
- When there is not enough evidence yet, show the status with "Early signal" in `ink-muted` beside it.

**Don't:** rename statuses, use them in the child app, or turn them into scores, grades or percentages.
