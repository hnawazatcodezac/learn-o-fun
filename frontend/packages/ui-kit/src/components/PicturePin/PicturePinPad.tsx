import {
  PICTURE_PIN_LENGTH,
  PIN_PICTURES,
  type PinPicture as PinPictureId,
} from '@learnofun/contracts';
import { useI18n } from '../../i18n/useI18n';
import { DeleteIcon } from '../icons';
import { PinPicture } from './PinPicture';

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
 * The slots above the pad fill in as pictures are chosen; the caller acts once all three are.
 */
export function PicturePinPad({ value, onChange, label, disabled = false }: PicturePinPadProps) {
  const { t } = useI18n();
  const full = value.length >= PICTURE_PIN_LENGTH;

  return (
    <div className="lf-pin">
      <div className="lf-pin__entry" aria-hidden="true">
        {Array.from({ length: PICTURE_PIN_LENGTH }, (_, index) => {
          const picture = value[index];
          return (
            <span key={index} className={`lf-pin__slot${picture ? ' lf-pin__slot--filled' : ''}`}>
              {picture && <PinPicture picture={picture} />}
            </span>
          );
        })}
      </div>
      <p className="lf-visually-hidden" role="status">
        {t('ui.picturePin.progress', { count: value.length, total: PICTURE_PIN_LENGTH })}
      </p>
      <div className="lf-pin__pad" role="group" aria-label={label}>
        {PIN_PICTURES.map((picture) => (
          <button
            key={picture}
            type="button"
            className="lf-pin__picture"
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
        className="lf-pin__delete"
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
