import {
  PICTURE_PIN_LENGTH,
  PIN_PICTURES,
  type PinPicture as PinPictureId,
} from '@learnofun/contracts';
import { cn } from '../../cn';
import { useI18n } from '../../i18n/useI18n';
import { DeleteIcon } from '../icons';
import { DISABLED_CLASSES, FOCUS_CLASSES, PLAY_PIECE_CLASSES } from '../pieces';
import { PinPicture } from './PinPicture';

/** The pad's keys: play pieces in the Play world. */
const KEY_CLASSES = cn(
  'grid cursor-pointer place-items-center rounded-ui border-2 border-line-strong bg-surface-raised p-0 text-ink min-block-ui-target min-inline-ui-target',
  PLAY_PIECE_CLASSES,
  FOCUS_CLASSES,
  DISABLED_CLASSES,
);

export interface PicturePinPadProps {
  /** The pictures chosen so far, in order. */
  value: readonly PinPictureId[];
  onChange: (next: PinPictureId[]) => void;
  /** Names the pad for screen readers, such as "Ari’s picture PIN". */
  label: string;
  disabled?: boolean;
}

/**
 * Enters a picture PIN (ADR 0018): three taps on nine pictures, with no reading and no free text.
 * The slots above the pad fill in as pictures are chosen, dashed while empty and solid once
 * filled; the caller acts once all three are.
 */
export function PicturePinPad({ value, onChange, label, disabled = false }: PicturePinPadProps) {
  const { t } = useI18n();
  const full = value.length >= PICTURE_PIN_LENGTH;

  return (
    <div className="lf-pin flex flex-col items-center gap-3">
      <div className="lf-pin__entry flex gap-ui-gap" aria-hidden="true">
        {Array.from({ length: PICTURE_PIN_LENGTH }, (_, index) => {
          const picture = value[index];
          return (
            <span
              key={index}
              className={cn(
                'lf-pin__slot grid place-items-center rounded-ui border-2 border-dashed border-line-strong bg-surface-sunken text-ink block-ui-target inline-ui-target',
                picture !== undefined &&
                  'lf-pin__slot--filled border-solid border-ink bg-surface-raised',
              )}
            >
              {picture && <PinPicture picture={picture} />}
            </span>
          );
        })}
      </div>
      <p className="sr-only" role="status">
        {t('ui.picturePin.progress', { count: value.length, total: PICTURE_PIN_LENGTH })}
      </p>
      <div
        className="lf-pin__pad grid grid-cols-[repeat(3,var(--ui-target))] gap-ui-gap"
        role="group"
        aria-label={label}
      >
        {PIN_PICTURES.map((picture) => (
          <button
            key={picture}
            type="button"
            className={cn('lf-pin__picture', KEY_CLASSES)}
            aria-label={t(`ui.picturePin.pictures.${picture}`)}
            disabled={disabled || full}
            onClick={() => {
              onChange([...value, picture]);
            }}
          >
            <PinPicture picture={picture} />
          </button>
        ))}
      </div>
      <button
        type="button"
        className={cn('lf-pin__delete', KEY_CLASSES)}
        aria-label={t('ui.picturePin.delete')}
        disabled={disabled || value.length === 0}
        onClick={() => {
          onChange(value.slice(0, -1));
        }}
      >
        <DeleteIcon />
      </button>
    </div>
  );
}
