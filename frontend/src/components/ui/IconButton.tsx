import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
  active?: boolean;
  size?: 'sm' | 'md';
}

/** Square icon-only button; `label` doubles as tooltip and accessible name. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, active, size = 'md', className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-lg text-ink-500 transition-colors',
        'hover:bg-surface-muted hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
        'disabled:pointer-events-none disabled:opacity-40',
        size === 'sm' ? 'h-7 w-7' : 'h-9 w-9',
        active && 'bg-surface-muted text-ink-900',
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
});
