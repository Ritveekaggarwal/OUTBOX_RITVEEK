import clsx from 'clsx';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={clsx('relative overflow-hidden rounded bg-surface-muted', className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  );
}

export function EmailRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-surface-line px-6 py-4">
      <Skeleton className="h-3.5 w-32" />
      <Skeleton className="h-6 w-28 rounded-full" />
      <Skeleton className="h-3.5 flex-1" />
      <Skeleton className="h-4 w-4 rounded-full" />
    </div>
  );
}
