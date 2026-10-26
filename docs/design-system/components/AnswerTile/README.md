# AnswerTile

A large, pressable answer a child taps: a number, a word, a picture or a sound.

**Provide:** the answer content, its state, and a spoken label for screen readers and pre-readers.

- At least `tile-min` square on `surface-raised`, with a `line-strong` border, `radius-lg` and `press-depth`. Numbers use `play-number`; words use `read-early`.
- **Selected:** `sky-soft` with a `sky-ink` border.
- **Correct:** `leaf-soft`, a `leaf-ink` border and text, and a check with the word "Correct".
- **Try again:** `sun-soft`, a `sun-ink` border and text, and a loop arrow with the words "Try again". Never red, never a cross.
- Keep `space-5` between tiles. Offer at most 3 tiles for ages 3 to 5 and 4 for ages 6 to 8.
- Tiles must work by keyboard and switch access, in the same order as they appear on screen.

**Don't:** shake or flash a tile after a wrong answer, or show the correct answer before the support ladder reaches "show me".
