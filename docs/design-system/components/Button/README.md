# Button

Play buttons are chunky and tactile for children; Family buttons are calm and compact for parents.

**Provide:** a verb-first label in sentence case, an optional leading icon, and an accessible name when the button shows only an icon.

- **Play primary** (`lf-btn-play`): `sun` fill, `on-bright` label in `play-label`, `radius-lg`, at least `target-play` tall (`target-early` for ages 3 to 5), resting on `press-depth`. On press it moves down 6px and the ledge disappears. One per screen.
- **Play secondary** (`lf-btn-play sky`): the same shape in `sky`, for "Hear it again" and other second actions.
- **Family primary** (`lf-btn-family`): `action` fill with an `on-action` label, `radius-md`, at least `target-family` tall.
- **Family quiet** (`lf-btn-family quiet`): `surface-raised` with a `line-strong` border, for everything that is not the page's main action.
- Every button shows `focus-ring` on keyboard focus.

**Don't:** put two `sun` buttons on one child screen, use `danger` styling in the child app, or put text on `teal`.
