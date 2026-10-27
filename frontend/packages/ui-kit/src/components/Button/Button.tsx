import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../cn';
import { DISABLED_CLASSES, FOCUS_CLASSES, PLAY_PIECE_CLASSES } from '../pieces';

/**
 * 'primary' is the screen's one main action: sun in Play, action in Family. 'secondary' is every
 * other action: sky in Play, quiet in Family (docs/design-system/components/Button).
 */
export type ButtonVariant = 'primary' | 'secondary';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'lf-button--primary bg-ui-primary text-ui-on-primary',
  secondary: 'lf-button--secondary border-ui-secondary-border bg-ui-secondary text-ui-on-secondary',
};

export interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'className' | 'style'
> {
  variant?: ButtonVariant;
  /** An optional leading icon, such as `<PauseIcon />`. */
  icon?: ReactNode;
  /** The label, verb first and in sentence case, from the catalog. */
  children: ReactNode;
}

/**
 * A button sized for the current experience band. Its label must come from the catalog. In the
 * Play world it is a chunky play piece, with more room either side; in the Family world, a calm
 * action or a quiet button.
 */
export function Button({
  variant = 'primary',
  type = 'button',
  icon,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={cn(
        'lf-button inline-flex cursor-pointer items-center justify-center gap-2 rounded-ui border-2 border-transparent px-5 py-0 font-ui-label text-ui-label min-block-ui-target min-inline-ui-target play:px-6',
        PLAY_PIECE_CLASSES,
        FOCUS_CLASSES,
        DISABLED_CLASSES,
        'disabled:focus-visible:shadow-focus-ring',
        VARIANT_CLASSES[variant],
      )}
    >
      {icon}
      <span className="lf-button__label">{children}</span>
    </button>
  );
}
