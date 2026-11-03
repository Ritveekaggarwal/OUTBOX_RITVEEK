import { useCallback, useRef, type ReactNode } from 'react';
import clsx from 'clsx';
import { useClickOutside } from '../../hooks/useClickOutside';

export interface PopoverProps {
  open: boolean;
  onClose: () => void;
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

/** Anchored floating panel that closes on outside click or Escape. */
export function Popover({ open, onClose, trigger, children, align = 'left', className }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => onClose(), [onClose]);
  useClickOutside(ref, close, open);

  return (
    <div ref={ref} className="relative">
      {trigger}
      {open && (
        <div
          role="dialog"
          className={clsx(
            'absolute top-full z-30 mt-2 animate-pop-in rounded-xl border border-surface-line bg-white shadow-popover',
            align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  icon,
  children,
  onClick,
  tone = 'default',
  disabled,
}: {
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:opacity-50',
        tone === 'danger' ? 'text-danger-text hover:bg-danger-bg' : 'text-ink-700 hover:bg-surface-muted',
      )}
    >
      {icon && <span className="shrink-0 text-ink-500">{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </button>
  );
}
