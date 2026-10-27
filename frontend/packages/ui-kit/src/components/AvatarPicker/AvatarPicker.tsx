import { useId } from 'react';
import { cn } from '../../cn';
import { useI18n } from '../../i18n/useI18n';
import { CheckIcon } from '../icons';
import { COVERING_INPUT_CLASSES } from '../pieces';
import { AVATARS, Avatar, type AvatarId } from './Avatar';

export interface AvatarPickerProps {
  /** Names the group, for example "Choose your picture". */
  label: string;
  value: AvatarId | undefined;
  onChange: (id: AvatarId) => void;
  avatars?: readonly AvatarId[];
  /** The ID of a hint or message about the choice, read out with the group's name. */
  describedBy?: string;
}

/**
 * Each avatar is a tile like an AnswerTile: tile-min square, on a ledge in the Play world. The
 * chosen one takes the selected state, with a tick, so it never relies on colour alone.
 */
const OPTION_CLASSES =
  'lf-avatar-picker__option group/avatar relative grid inline-tile-min block-tile-min cursor-pointer place-items-center rounded-ui border-3 border-line-strong bg-surface-raised p-3 transition-[translate,box-shadow] has-checked:border-ui-selected-border has-checked:bg-ui-selected has-focus-visible:shadow-focus-ring has-focus-visible:outline-none play:shadow-press-depth play:active:translate-y-ui-press play:active:shadow-none play:has-focus-visible:shadow-with-focus-press-depth';

/**
 * Choose one avatar. Native radio buttons give arrow-key navigation and screen-reader support.
 * For picking a profile, where a tap enters it, use buttons instead: arrow keys would enter
 * profiles by accident here.
 */
export function AvatarPicker({
  label,
  value,
  onChange,
  avatars = AVATARS,
  describedBy,
}: AvatarPickerProps) {
  const { t } = useI18n();
  const name = useId();

  return (
    <fieldset className="lf-avatar-picker m-0 border-0 p-0" aria-describedby={describedBy}>
      <legend className="lf-avatar-picker__legend mbe-3 p-0 font-ui-heading text-ui-heading">
        {label}
      </legend>
      <div className="lf-avatar-picker__options flex flex-wrap gap-4">
        {avatars.map((id) => (
          <label key={id} className={OPTION_CLASSES}>
            {/* The radio covers the whole tile, so the tile is the touch target. */}
            <input
              type="radio"
              className={cn('lf-avatar-picker__input', COVERING_INPUT_CLASSES)}
              name={name}
              value={id}
              checked={value === id}
              onChange={() => {
                onChange(id);
              }}
            />
            <Avatar id={id} />
            <span className="lf-avatar-picker__check absolute -inset-e-2 -inset-bs-2 hidden place-items-center rounded-full bg-leaf text-on-bright block-6 inline-6 group-has-checked/avatar:grid">
              <CheckIcon className="block-5 inline-5" />
            </span>
            <span className="sr-only">{t(`ui.avatars.${id}`)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
