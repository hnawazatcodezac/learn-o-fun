import { CheckIcon } from '../icons';

export interface SwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * An on/off setting. A native checkbox with the switch role, covering the whole row, so the row
 * is the touch target. On and off differ in the thumb's position and tick, not only in colour.
 */
export function Switch({ label, checked, onChange }: SwitchProps) {
  return (
    <label className="lf-switch">
      <input
        type="checkbox"
        role="switch"
        className="lf-switch__input"
        checked={checked}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
      />
      <span className="lf-switch__label">{label}</span>
      <span className="lf-switch__track" aria-hidden="true">
        <span className="lf-switch__thumb">
          <CheckIcon />
        </span>
      </span>
    </label>
  );
}
