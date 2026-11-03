import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'outline' | 'soft' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  fullWidth?: boolean;
  pill?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
  outline: 'border border-brand-600 text-brand-600 bg-white hover:bg-brand-50',
  soft: 'bg-brand-50 text-ink-900 hover:bg-brand-100',
  ghost: 'text-ink-700 hover:bg-surface-muted',
  danger: 'bg-danger-text text-white hover:opacity-90',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, leftIcon, fullWidth, pill, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex select-none items-center justify-center font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-1',
        'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        pill ? 'rounded-full' : 'rounded-lg',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? <Spinner size={14} /> : leftIcon}
      {children}
    </button>
  );
});
