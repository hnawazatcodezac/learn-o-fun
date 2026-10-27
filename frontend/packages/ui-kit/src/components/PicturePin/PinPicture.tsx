import type { PinPicture as PinPictureId } from '@learnofun/contracts';
import type { ReactNode } from 'react';
import { ICON_CLASSES } from '../icons';

/*
 * The picture-PIN pictures (ADR 0018), in the designs' icon style (ADR 0045): friendly shapes on
 * the 24-pixel grid, each filled in a brand colour and outlined in its ink. Each is its own shape,
 * so no picture is told apart by colour alone.
 */
const PICTURES: Record<PinPictureId, ReactNode> = {
  sun: (
    <>
      <path
        d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"
        className="stroke-sun-ink"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="4.5" className="fill-sun stroke-sun-ink" />
    </>
  ),
  moon: (
    <path
      d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z"
      className="fill-sky-soft stroke-sky-ink"
    />
  ),
  star: (
    <path
      d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"
      className="fill-sun stroke-sun-ink"
    />
  ),
  heart: (
    <path
      d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.5a4.3 4.3 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10z"
      className="fill-coral stroke-coral-ink"
    />
  ),
  cloud: (
    <path
      d="M7 18h10a4 4 0 0 0 .6-8 5.5 5.5 0 0 0-10.6 1.5A3.3 3.3 0 0 0 7 18z"
      className="fill-surface-raised stroke-sky-ink"
    />
  ),
  flower: (
    <>
      <circle cx="12" cy="6.5" r="3.2" className="fill-coral-soft stroke-coral-ink" />
      <circle cx="17.2" cy="10.3" r="3.2" className="fill-coral-soft stroke-coral-ink" />
      <circle cx="15.2" cy="16.4" r="3.2" className="fill-coral-soft stroke-coral-ink" />
      <circle cx="8.8" cy="16.4" r="3.2" className="fill-coral-soft stroke-coral-ink" />
      <circle cx="6.8" cy="10.3" r="3.2" className="fill-coral-soft stroke-coral-ink" />
      <circle cx="12" cy="12" r="2.8" className="fill-sun stroke-sun-ink" />
    </>
  ),
  fish: (
    <>
      <path d="M5 12L2 8.5v7z" className="fill-teal stroke-teal-ink" />
      <path
        d="M5 12c2.5-3.5 5.5-5.5 9-5.5 3.2 0 5.6 2.2 7 5.5-1.4 3.3-3.8 5.5-7 5.5-3.5 0-6.5-2-9-5.5z"
        className="fill-teal stroke-teal-ink"
      />
      <path d="M16 10.5h.01" className="stroke-teal-ink" strokeWidth="2.5" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14z" className="fill-leaf stroke-leaf-ink" />
      <path d="M5 19c3-3 6-6 9-9" className="stroke-leaf-ink" />
    </>
  ),
  drop: (
    <path
      d="M12 3.5c3 4 6 7.2 6 10.5a6 6 0 0 1-12 0c0-3.3 3-6.5 6-10.5z"
      className="fill-sky stroke-sky-ink"
    />
  ),
};

/** One picture of a picture PIN (ADR 0018). Decorative: whatever shows it gives it a name. */
export function PinPicture({ picture }: { picture: PinPictureId }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={ICON_CLASSES}
    >
      {PICTURES[picture]}
    </svg>
  );
}
