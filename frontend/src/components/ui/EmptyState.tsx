import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex animate-fade-in flex-col items-center justify-center px-6 py-20 text-center">
      <div className="relative mb-5">
        <div className="absolute inset-0 scale-150 rounded-full bg-brand-50 blur-xl" aria-hidden="true" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-100 bg-white text-brand-600 shadow-card">
          {icon}
        </div>
      </div>
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
