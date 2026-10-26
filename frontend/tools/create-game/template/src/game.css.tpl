.g-{{id}} {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-5);
  text-align: center;
}

.g-{{id}}__instructions {
  margin: 0;
  color: var(--ink-muted);
}

.g-{{id}}__prompt {
  margin: 0;
  font-family: var(--play-number-font-family);
  font-size: var(--play-number-font-size);
  font-weight: var(--play-number-font-weight);
  line-height: var(--play-number-line-height);
}

/* The answers are the UI kit's answer tiles (ADR 0020), space-5 apart as the spec asks. */
.g-{{id}}__answers {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: center;
  gap: var(--space-5);
}

.g-{{id}}__hint {
  min-block-size: 1lh;
  margin: 0;
  font-family: var(--play-label-font-family);
  font-size: var(--play-label-font-size);
  font-weight: var(--play-label-font-weight);
  line-height: var(--play-label-line-height);
}

/*
 * On phones, three tiles space-5 apart are wider than the screen, so they wrap onto two rows; the
 * game gives up its own padding to keep everything on screen (ADR 0012).
 */
@media (width < 30rem) {
  .g-{{id}} {
    gap: var(--space-3);
    padding-block: 0;
  }
}
