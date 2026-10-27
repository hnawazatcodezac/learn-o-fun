/*
 * Classes that pages in both areas share (ADR 0043): Tailwind utilities on the theme, joined into
 * a page's classes with cn() where it needs more.
 */

/** A page of its own, centred on the screen: who's playing, loading, not found. */
export const PLACEHOLDER_CLASSES = 'grid min-block-dvh place-items-center px-4';

/** The title of such a page, at the world's title size. */
export const PLACEHOLDER_TITLE_CLASSES = 'mbs-0 mbe-2 text-size-ui-title';

/** Loading and error states: centred, a line apart. */
export const LOAD_STATE_CLASSES = 'm-0 flex flex-col items-center gap-2 text-center [&_p]:m-0';
