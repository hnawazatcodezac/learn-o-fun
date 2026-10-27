/*
 * The parent dashboard's shared classes (ADR 0043): the design system's Family world, calm and
 * clear. Its pages have no experience band, so the ui-* roles are Family's, and text stays within
 * the reading measure.
 */

/** A page: the reading measure with its padding, centred. */
export const PAGE_CLASSES =
  'mx-auto box-border flex inline-full max-inline-ui-family-page flex-col gap-4 p-5 [&_p]:m-0';

/** The sign-in page: a page outside the dashboard's shell, so its links take action here. */
export const LOGIN_CLASSES =
  'mx-auto box-border flex inline-full max-inline-ui-family-page flex-col gap-4 p-5 [&_a]:text-action [&_p]:m-0';

/** Until a logo exists, the name in display at weight 800 in ink (design system README). */
export const WORDMARK_CLASSES = 'm-0 font-display text-family-title font-wordmark text-ink';

export const TITLE_CLASSES = 'm-0 font-sans text-family-title';

export const HEADING_CLASSES = 'mbs-0 mbe-3 font-sans text-family-heading';

/** A strand's name above its skills, and a session's activity. */
export const STRAND_TITLE_CLASSES = 'm-0 font-sans text-family-label';

/** Small text beside the main text: a hint, a note, a plan's limit, a card's details. */
export const HINT_CLASSES = 'text-family-small text-ink-muted';

export const SECTION_CLASSES = 'flex flex-col gap-3';

/** A row of actions under a form or a section. */
export const ACTIONS_CLASSES = 'flex flex-wrap items-center gap-3';

/** A list in a row that wraps, such as the children's cards. */
export const WRAPPING_LIST_CLASSES = 'm-0 flex list-none flex-wrap gap-3 p-0';

/** A list in a column, such as Today's cards. */
export const COLUMN_LIST_CLASSES = 'm-0 flex list-none flex-col gap-3 p-0';

/** A card with why it is there (plan 4.4), or a session. */
export const CARD_CLASSES =
  'parent-reasons__card flex flex-col gap-1 rounded-md border border-line bg-surface-raised p-ui-card shadow-sm';

/** A session in the history: a card, with the hook the tests find each session by. */
export const SESSION_CARD_CLASSES =
  'parent-reasons__card parent-session flex flex-col gap-1 rounded-md border border-line bg-surface-raised p-ui-card shadow-sm';

export const CARD_LINK_CLASSES = 'inline-flex min-block-target-family items-center font-label';

export const FORM_CLASSES = 'flex flex-col gap-5';

/** A label or legend with its control, hint and message. */
export const FIELD_CLASSES =
  'm-0 flex min-inline-0 flex-col items-start gap-2 border-0 p-0 [&_label]:p-0 [&_label]:font-label [&_legend]:p-0 [&_legend]:font-label';

/** Fields side by side, such as a birth month and year. */
export const FIELD_ROW_CLASSES = 'flex flex-wrap gap-3';

export const FIELD_PART_CLASSES = 'flex flex-col gap-1';

/**
 * A menu or a date field, Family-sized. A field to change has its edge in danger, beside a message
 * with an icon and words.
 */
export const CONTROL_CLASSES =
  'min-block-target-family rounded-md border-2 border-line-strong bg-surface-raised px-3 font-inherit text-ink aria-invalid:border-danger';

/** A text field, as wide as its field. */
export const TEXT_CONTROL_CLASSES =
  'box-border min-block-target-family inline-full rounded-md border-2 border-line-strong bg-surface-raised px-3 font-inherit text-ink aria-invalid:border-danger';

export const RADIO_CLASSES = 'm-0 inline-5 block-5 accent-action';

export const ERROR_CLASSES = 'parent-field__error flex items-center gap-2 font-label text-danger';
