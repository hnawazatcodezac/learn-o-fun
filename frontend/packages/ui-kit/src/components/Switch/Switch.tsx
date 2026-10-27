import { cn } from '../../cn';
import { CheckIcon } from '../icons';
import { COVERING_INPUT_CLASSES } from '../pieces';

export interface SwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * An on/off setting. A native checkbox with the switch role, covering the whole row, so the row
 * is the touch target. On is the selected state (ADR 0019): on and off differ in the thumb's
 * position and tick, not only in colour.
 */
export function Switch({ label, checked, onChange }: SwitchProps) {
  return (
    <label className="lf-switch group/switch relative flex cursor-pointer items-center justify-between gap-4 min-block-ui-target">
      <input
        type="checkbox"
        role="switch"
        className={cn('lf-switch__input', COVERING_INPUT_CLASSES)}
        checked={checked}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
      />
      <span className="lf-switch__label">{label}</span>
      <span
        className="lf-switch__track relative flex-none rounded-full border-2 border-ink-muted bg-surface-raised transition-[background-color,border-color] block-6 inline-7 group-has-checked/switch:border-ui-selected-border group-has-checked/switch:bg-ui-on-selected group-has-focus-visible/switch:shadow-focus-ring group-has-focus-visible/switch:outline-none"
        aria-hidden="true"
      >
        {/* On, the thumb moves to the track's far end: its 48px less the 24px thumb, 4px either side. */}
        <span className="lf-switch__thumb absolute inset-s-1 inset-bs-1/2 grid -translate-y-1/2 place-items-center rounded-full bg-ink-muted text-ui-on-selected transition-[translate,background-color] block-5 inline-5 group-has-checked/switch:translate-x-4 group-has-checked/switch:bg-ui-selected rtl:group-has-checked/switch:-translate-x-4">
          {/* A mark inside the thumb, so smaller than an icon. */}
          <CheckIcon className="invisible block-4 inline-4 group-has-checked/switch:visible" />
        </span>
      </span>
    </label>
  );
}
