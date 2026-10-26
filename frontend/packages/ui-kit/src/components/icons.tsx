import { ArrowCounterClockwiseIcon as PhosphorArrowCounterClockwise } from '@phosphor-icons/react/dist/csr/ArrowCounterClockwise';
import { BackspaceIcon as PhosphorBackspace } from '@phosphor-icons/react/dist/csr/Backspace';
import { CheckIcon as PhosphorCheck } from '@phosphor-icons/react/dist/csr/Check';
import { LightbulbIcon as PhosphorLightbulb } from '@phosphor-icons/react/dist/csr/Lightbulb';
import { PauseIcon as PhosphorPause } from '@phosphor-icons/react/dist/csr/Pause';
import { StarIcon as PhosphorStar } from '@phosphor-icons/react/dist/csr/Star';
import { WarningCircleIcon as PhosphorWarningCircle } from '@phosphor-icons/react/dist/csr/WarningCircle';
import { XIcon as PhosphorX } from '@phosphor-icons/react/dist/csr/X';

/*
 * The icons the UI kit uses, from Phosphor (ADR 0019). Each is decoration: the control around it
 * carries the name. The weight follows the world (Bold in Play, Regular in Family) through the
 * icon context that AppearanceProvider sets, and the size is the --ui-icon-size role. Import each
 * icon from its own file, so development builds do not load the whole set.
 */
const DECORATIVE = { className: 'lf-icon', 'aria-hidden': true, focusable: 'false' } as const;

/** Mirrored right to left, because it points along the line of text. */
const MIRRORED = { ...DECORATIVE, className: 'lf-icon lf-icon--mirrored' } as const;

export function CloseIcon() {
  return <PhosphorX {...DECORATIVE} />;
}

/** A warning circle, beside a parent form's message: danger always has an icon and words. */
export function WarningIcon() {
  return <PhosphorWarningCircle {...DECORATIVE} />;
}

export function CheckIcon() {
  return <PhosphorCheck {...DECORATIVE} />;
}

/** A loop arrow, for "try again". */
export function RetryIcon() {
  return <PhosphorArrowCounterClockwise {...DECORATIVE} />;
}

export function DeleteIcon() {
  return <PhosphorBackspace {...MIRRORED} />;
}

export function StarIcon() {
  return <PhosphorStar {...DECORATIVE} />;
}

export function PauseIcon() {
  return <PhosphorPause {...DECORATIVE} />;
}

/** A light bulb, for the hint button. */
export function HintIcon() {
  return <PhosphorLightbulb {...DECORATIVE} />;
}
