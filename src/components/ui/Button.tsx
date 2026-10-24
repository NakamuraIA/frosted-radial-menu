import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

/** Botão base com variantes visuais e estado de carregamento. */
export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  loading = false,
  children,
  className,
  disabled,
  type = 'button',
  ref,
  ...rest
}: ButtonProps) {
  const classes = ['ui-btn', `ui-btn--${variant}`, `ui-btn--${size}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button {...rest} ref={ref} type={type} className={classes} disabled={disabled || loading}>
      {loading ? <span className="ui-btn__spinner" aria-hidden="true" /> : icon}
      {children ? <span>{children}</span> : null}
    </button>
  );
}
