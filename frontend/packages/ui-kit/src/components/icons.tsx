import type { ReactNode } from 'react';
import { cn } from '../cn';

/*
 * Learnofun's own icons (ADR 0045), as the screen designs draw them: line icons on a 24-pixel
 * grid with rounded caps and joins, in the text colour, at the stroke width the design gives each.
 * Each is decoration: the control around it carries the name. The size is the --ui-icon-size role
 * (28px in Play, 20px in Family); a mark inside a badge passes a smaller size as `className`.
 * Close, Warning, Pause and Delete are drawn in the same style, as the designs have none.
 */

/** An icon at the world's size. */
export const ICON_CLASSES = 'lf-icon block inline-ui-icon block-ui-icon flex-none';

/** Turned round right to left, for an icon that points along the line of text. */
const MIRRORED_CLASSES = 'lf-icon--mirrored rtl:-scale-x-100';

export interface IconProps {
  /** Classes for this use, such as a smaller size for a mark inside a badge. */
  className?: string | undefined;
}

interface DrawingProps extends IconProps {
  stroke?: number;
  mirrored?: boolean;
  children: ReactNode;
}

function Drawing({ className, stroke = 2.5, mirrored = false, children }: DrawingProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn(ICON_CLASSES, mirrored && MIRRORED_CLASSES, className)}
    >
      {children}
    </svg>
  );
}

/** The star's outline, shared by the filled, outlined and sticker stars. */
const STAR = 'M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z';

/** The speaker, shared by the sound icons. */
const SPEAKER = 'M4 9.5h3.5L12 5.5v13l-4.5-4H4z';

export function CheckIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} stroke={3.5}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Drawing>
  );
}

/** A loop arrow, for "try again". */
export function RetryIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} stroke={3}>
      <path d="M4 12a8 8 0 1 1 2.3 5.7" />
      <path d="M4 18v-6h6" />
    </Drawing>
  );
}

/** A light bulb, for the hint button. */
export function HintIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} stroke={3}>
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
    </Drawing>
  );
}

/** A filled star, such as a game's stars or the end of the progress trail. */
export function StarIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} stroke={0}>
      <path d={STAR} fill="currentColor" />
    </Drawing>
  );
}

export function StarOutlineIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} stroke={2}>
      <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z" />
    </Drawing>
  );
}

/** A sticker's star, in sun with its ink: one of the designs' coloured icons. */
export function StickerIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} stroke={1.5}>
      <path d={STAR} className="fill-sun stroke-sun-ink" />
    </Drawing>
  );
}

/** A sprout, for something growing: one of the designs' coloured icons. */
export function SproutIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} stroke={2.5}>
      <path d="M12 20v-7" className="stroke-leaf-ink" />
      <path
        d="M12 13c-3.5 0-5.5-2-5.5-5 3.5 0 5.5 2 5.5 5zM12 13c0-3 2-5 5.5-5 0 3-2 5-5.5 5z"
        className="fill-leaf stroke-none"
      />
    </Drawing>
  );
}

/** "Hear it again": a speaker with its sound. */
export function SoundIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className}>
      <path d={SPEAKER} />
      <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />
    </Drawing>
  );
}

/** A speaker for one sound, such as a phoneme. */
export function SpeakerIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className}>
      <path d={SPEAKER} />
      <path d="M16 9a4 4 0 0 1 0 6" />
    </Drawing>
  );
}

export function SoundOffIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className}>
      <path d={SPEAKER} />
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    </Drawing>
  );
}

/** "Say it fast": sounds blending into a word. */
export function BlendIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} stroke={2.6} mirrored>
      <path d="M3 7h6l4 5-4 5H3" />
      <path d="M21 12h-8" />
      <path d="M18 9l3 3-3 3" />
    </Drawing>
  );
}

/** A tapping finger, for "tap each one". */
export function TapIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className}>
      <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M12 10.5V9a1.5 1.5 0 0 1 3 0v2" />
      <path d="M15 10.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-.5a6 6 0 0 1-5-2.7L4 14.5a1.6 1.6 0 0 1 2.6-1.8L9 15" />
    </Drawing>
  );
}

export function PlayIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} stroke={2}>
      <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" />
    </Drawing>
  );
}

/** Two bars, for pausing a game. */
export function PauseIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} stroke={3.5}>
      <path d="M8.5 5v14M15.5 5v14" />
    </Drawing>
  );
}

export function HomeIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} stroke={2.8}>
      <path d="M4 11.5L12 5l8 6.5" />
      <path d="M6.5 10v9h11v-9" />
    </Drawing>
  );
}

/** Four squares, for "other games". */
export function GamesIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} stroke={0}>
      <rect x="3" y="3" width="8" height="8" rx="2.5" fill="currentColor" />
      <rect x="13" y="3" width="8" height="8" rx="2.5" fill="currentColor" />
      <rect x="3" y="13" width="8" height="8" rx="2.5" fill="currentColor" />
      <rect x="13" y="13" width="8" height="8" rx="2.5" fill="currentColor" />
    </Drawing>
  );
}

/** Forward, along the line of text. */
export function NextIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} stroke={3} mirrored>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Drawing>
  );
}

/** Back, against the line of text. */
export function BackIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} stroke={3} mirrored>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </Drawing>
  );
}

export function PlusIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} stroke={2.6}>
      <path d="M12 5v14M5 12h14" />
    </Drawing>
  );
}

export function CloseIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Drawing>
  );
}

/** A warning circle, beside a parent form's message: danger always has an icon and words. */
export function WarningIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} stroke={2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5h.01" />
    </Drawing>
  );
}

/** Delete the last entry, as a keypad's backspace key. */
export function DeleteIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} mirrored>
      <path d="M9 5h10a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-6-7z" />
      <path d="M12.5 9.5l5 5M17.5 9.5l-5 5" />
    </Drawing>
  );
}

export function SignInIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} mirrored>
      <path d="M15 3h4a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H4" />
    </Drawing>
  );
}

export function SignOutIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} mirrored>
      <path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4M16 17l5-5-5-5M21 12H9" />
    </Drawing>
  );
}

export function LockIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} stroke={2.2}>
      <rect x="5" y="10" width="14" height="10" rx="2.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </Drawing>
  );
}

export function UserIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} stroke={2.4}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </Drawing>
  );
}

export function KeyIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} stroke={2}>
      <circle cx="8" cy="12" r="4" />
      <path d="M12 12h9M18 12v3M21 12v2" />
    </Drawing>
  );
}

export function ShieldIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} stroke={2}>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
    </Drawing>
  );
}

export function ShieldCheckIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} stroke={2}>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </Drawing>
  );
}

export function DownloadIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} stroke={2}>
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </Drawing>
  );
}

export function ChevronDownIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} stroke={2.2}>
      <path d="M6 9l6 6 6-6" />
    </Drawing>
  );
}

export function PrinterIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} stroke={2}>
      <path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M6 14h12v7H6z" />
    </Drawing>
  );
}

export function BookIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} stroke={2}>
      <path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1z" />
      <path d="M12 6v14" />
    </Drawing>
  );
}

export function ClockIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} stroke={2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Drawing>
  );
}

/** "None of these": no ads, no tracking. */
export function BanIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} stroke={2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </Drawing>
  );
}

/** No chat with anyone. */
export function NoChatIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} stroke={2}>
      <path d="M4 5h16v10H9l-5 4z" />
      <path d="M3 3l18 18" />
    </Drawing>
  );
}

/** No purchases for children. */
export function NoPurchaseIcon({ className }: IconProps = {}) {
  return (
    <Drawing className={className} stroke={2}>
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path d="M3 10h18" />
      <path d="M3 3l18 18" />
    </Drawing>
  );
}
