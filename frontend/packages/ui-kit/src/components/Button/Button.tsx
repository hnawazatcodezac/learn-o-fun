import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * 'primary' is the screen's one main action: sun in Play, action in Family. 'secondary' is every
 * other action: sky in Play, quiet in Family (docs/design-system/components/Button).
 */
export type ButtonVariant = 'primary' | 'secondary';

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

/** A button sized for the current experience band. Its label must come from the catalog. */
export function Button({
  variant = 'primary',
  type = 'button',
  icon,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button {...rest} type={type} className={`lf-button lf-button--${variant}`}>
      {icon}
      <span className="lf-button__label">{children}</span>
    </button>
  );
}
