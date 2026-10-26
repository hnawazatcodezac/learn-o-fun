import type { ButtonHTMLAttributes } from 'react';
import { useI18n } from '../../i18n/useI18n';

/** Why a card is on Today (docs/design-system/components/ActivityCard). */
export const ACTIVITY_CARD_KINDS = ['review', 'new', 'choice'] as const;

export type ActivityCardKind = (typeof ACTIVITY_CARD_KINDS)[number];

/** Pebbles and discs placed as in the spec's preview, on a 232 × 112 art band. */
type Shape = readonly [
  shape: 'disc' | 'pebble',
  fill: 'soft' | 'leaf' | 'navy' | 'sun',
  x: number,
  y: number,
  width: number,
  height: number,
];

/**
 * Placeholder art until the illustrations exist: plain geometric shapes in the brand fills
 * (design system README, Illustration). Each kind has its own picture, so it is not told apart by
 * colour alone; the kind's words say it too.
 */
const ART: Record<ActivityCardKind, readonly Shape[]> = {
  review: [
    ['disc', 'soft', 24, 20, 72, 72],
    ['pebble', 'navy', 112, 44, 96, 48],
    ['disc', 'sun', 176, 12, 32, 32],
  ],
  new: [
    ['pebble', 'soft', 20, 52, 112, 40],
    ['disc', 'leaf', 148, 20, 48, 48],
    ['disc', 'navy', 196, 76, 20, 20],
  ],
  choice: [
    ['pebble', 'soft', 24, 24, 40, 40],
    ['pebble', 'soft', 72, 24, 40, 40],
    ['pebble', 'leaf', 24, 72, 40, 40],
    ['pebble', 'leaf', 72, 72, 40, 40],
    ['disc', 'navy', 144, 36, 56, 56],
  ],
};

/** radius-lg, in the art band's units. */
const PEBBLE_RADIUS = 24;

export interface ActivityCardProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'className' | 'style' | 'children' | 'title'
> {
  /** Why the card is on Today. Leave it out where there is no reason, as in the library. */
  kind?: ActivityCardKind | undefined;
  /** The activity's title, in the child's language. */
  title: string;
  /** The approximate length of a session (ADR 0021). */
  minutes: number;
}

/**
 * A card that starts one activity: art in the kind's colour, the kind, the title and about how
 * long it takes. The whole card is one button. It never shows scores, stars, prices or a lock:
 * content the family cannot use is not shown at all.
 */
export function ActivityCard({
  kind,
  title,
  minutes,
  type = 'button',
  ...rest
}: ActivityCardProps) {
  const { t } = useI18n();
  const art = kind ?? 'choice';

  return (
    <button {...rest} type={type} className={`lf-activity-card lf-activity-card--${art}`}>
      <svg
        className="lf-activity-card__art"
        viewBox="0 0 232 112"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        {ART[art].map(([shape, fill, x, y, width, height], index) => (
          <rect
            key={index}
            className={`lf-activity-card__shape lf-activity-card__shape--${fill}`}
            x={x}
            y={y}
            width={width}
            height={height}
            rx={shape === 'disc' ? width / 2 : PEBBLE_RADIUS}
          />
        ))}
      </svg>
      <span className="lf-activity-card__body">
        {kind !== undefined && (
          <span className="lf-activity-card__kind">{t(`ui.activityCard.kinds.${kind}`)}</span>
        )}
        <span className="lf-activity-card__title">{title}</span>
        <span className="lf-activity-card__length">
          {t('ui.activityCard.minutes', { minutes })}
        </span>
      </span>
    </button>
  );
}
