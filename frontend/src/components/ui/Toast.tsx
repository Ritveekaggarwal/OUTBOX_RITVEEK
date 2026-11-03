import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { AlertIcon, CheckIcon, CloseIcon } from '../icons';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastApi {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE_STYLES: Record<ToastTone, string> = {
  success: 'bg-brand-50 text-brand-600',
  error: 'bg-danger-bg text-danger-text',
  info: 'bg-surface-muted text-ink-700',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((items) => items.filter((toast) => toast.id !== id)), []);

  const push = useCallback(
    (tone: ToastTone, title: string, description?: string) => {
      const id = ++nextId.current;
      setToasts((items) => [...items.slice(-3), { id, tone, title, description }]);
      window.setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 4000);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, description) => push('success', title, description),
      error: (title, description) => push('error', title, description),
      info: (title, description) => push('info', title, description),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[360px] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex animate-slide-up items-start gap-3 rounded-xl border border-surface-line bg-white p-3.5 shadow-popover"
          >
            <span className={clsx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', TONE_STYLES[toast.tone])}>
              {toast.tone === 'success' ? <CheckIcon size={16} /> : <AlertIcon size={16} />}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-medium text-ink-900">{toast.title}</p>
              {toast.description && <p className="mt-0.5 text-xs text-ink-500">{toast.description}</p>}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(toast.id)}
              className="rounded p-1 text-ink-400 hover:bg-surface-muted hover:text-ink-700"
            >
              <CloseIcon size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}
