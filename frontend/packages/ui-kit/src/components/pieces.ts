/*
 * Classes that several components share (ADR 0043). Each is a list of Tailwind utilities on the
 * theme, joined into a component's classes with cn().
 */

/**
 * A play piece (design system README): in the Play world it rests on a press-depth ledge and,
 * pressed, moves down 6px as the ledge disappears; keyboard focus rings it, ledge and all.
 */
export const PLAY_PIECE_CLASSES =
  'transition-[translate,box-shadow] play:shadow-press-depth play:focus-visible:shadow-with-focus-press-depth play:enabled:active:translate-y-ui-press play:enabled:active:shadow-none';

/** Disabled shows by shape as well as colour: no ledge, sunken and muted (ADR 0019). */
export const DISABLED_CLASSES =
  'disabled:cursor-not-allowed disabled:border-ui-disabled-border disabled:bg-ui-disabled disabled:text-ui-on-disabled disabled:shadow-none';

/** Keyboard focus shows the focus ring, which replaces the outline (.claude/rules/frontend.md). */
export const FOCUS_CLASSES = 'focus-visible:shadow-focus-ring focus-visible:outline-none';

/** A native radio or checkbox stretched over its label, so the whole label is the touch target. */
export const COVERING_INPUT_CLASSES =
  'absolute inset-0 m-0 inline-full block-full cursor-pointer opacity-0';

/** A round button for a single icon, such as a dialog's or a toast's close button. */
export const ICON_BUTTON_CLASSES =
  'grid inline-ui-target block-ui-target flex-none cursor-pointer place-items-center rounded-full border-2 border-transparent bg-transparent p-0 text-ink hover:border-line';
