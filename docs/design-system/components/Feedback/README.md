# Feedback

The short message a child sees and hears straight after an answer.

**Provide:** the kind (correct, try again or hint), one line in `play-label`, an optional second line, and the audio for both.

- **Correct:** `leaf-soft` with `leaf-ink` text and a `leaf` badge holding a check. Praise the strategy: "You counted on from 7."
- **Try again:** `sun-soft` with `sun-ink` text and a `sun` badge holding a loop arrow. Give a next step: "Nearly. Try one more hop."
- **Hint:** `sky-soft` with `sky-ink` text and a `sky` badge holding a light bulb. Give the first move, not the answer.
- `radius-lg`, padding `space-4` by `space-5`, announced to screen readers as a status.
- Show it for about 1.5 seconds, or until the child taps. Never block the next question for longer.

**Don't:** use red, crosses, sad faces or the words "Wrong" and "Incorrect", and never count mistakes in front of the child.
