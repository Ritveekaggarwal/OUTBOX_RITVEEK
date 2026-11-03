import type { ReactNode } from 'react';
import clsx from 'clsx';
import type { EmailSummary } from '../../types/api';
import { formatPillDate } from '../../utils/format';
import { ClockIcon } from '../icons';

/** Status chip shown before the subject, matching the Figma list rows. */
export function StatusPill({ email }: { email: EmailSummary }) {
  switch (email.status) {
    case 'SCHEDULED':
      return (
        <Pill className="bg-pending-bg text-pending-text">
          <ClockIcon size={12} />
          {formatPillDate(email.scheduledAt)}
        </Pill>
      );
    case 'RATE_LIMITED':
      return (
        <Pill className="bg-highlight-bg text-[#A16207]" title="Hourly limit reached, moved to the next window">
          <ClockIcon size={12} />
          Throttled · {formatPillDate(email.scheduledAt)}
        </Pill>
      );
    case 'SENDING':
      return (
        <Pill className="bg-brand-50 text-brand-600">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-600" />
          Sending
        </Pill>
      );
    case 'SENT':
      return <Pill className="bg-sent-bg text-sent-text">Sent</Pill>;
    case 'FAILED':
      return (
        <Pill className="bg-danger-bg text-danger-text" title={email.failedReason ?? undefined}>
          Failed
        </Pill>
      );
    default:
      return <Pill className="bg-sent-bg text-sent-text">Cancelled</Pill>;
  }
}

function Pill({ className, children, title }: { className: string; children: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={clsx(
        'inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-xs font-medium',
        className,
      )}
    >
      {children}
    </span>
  );
}
