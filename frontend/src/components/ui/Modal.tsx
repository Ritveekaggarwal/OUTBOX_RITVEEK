import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = 'primary',
  loading,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onCancel();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-ink-900/30 p-4 backdrop-blur-[2px]">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-sm animate-pop-in rounded-2xl bg-white p-6 shadow-popover"
      >
        <h2 id="confirm-title" className="text-base font-semibold text-ink-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-ink-500">{description}</p>
        {children}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
