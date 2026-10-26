import { useId } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { CheckIcon } from '../icons';
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
    <fieldset className="lf-avatar-picker" aria-describedby={describedBy}>
      <legend className="lf-avatar-picker__legend">{label}</legend>
      <div className="lf-avatar-picker__options">
        {avatars.map((id) => (
          <label key={id} className="lf-avatar-picker__option">
            <input
              type="radio"
              className="lf-avatar-picker__input"
              name={name}
              value={id}
              checked={value === id}
              onChange={() => {
                onChange(id);
              }}
            />
            <Avatar id={id} />
            <span className="lf-avatar-picker__check">
              <CheckIcon />
            </span>
            <span className="lf-visually-hidden">{t(`ui.avatars.${id}`)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
