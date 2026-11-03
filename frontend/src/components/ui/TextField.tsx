import { forwardRef, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

/** Filled grey input used on the login screen. */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { error, className, ...props },
  ref,
) {
  return (
    <div className="w-full">
      <input
        ref={ref}
        aria-invalid={Boolean(error)}
        className={clsx(
          'h-12 w-full rounded-lg bg-surface-muted px-4 text-sm text-ink-900 outline-none transition',
          'placeholder:text-ink-400 focus:bg-white focus:ring-2 focus:ring-brand-500/30',
          error && 'ring-2 ring-danger-text/40',
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-danger-text">{error}</p>}
    </div>
  );
});
