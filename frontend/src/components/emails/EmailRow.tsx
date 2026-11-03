import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import type { EmailSummary } from '../../types/api';
import { formatPillDate, nameFromEmail } from '../../utils/format';
import { StarIcon } from '../icons';
import { StatusPill } from '../ui/StatusPill';

export interface EmailRowProps {
  email: EmailSummary;
  onToggleStar: (email: EmailSummary) => void;
  showSentTime?: boolean;
}

/** One line in the Scheduled / Sent list: "To: name · pill · subject - preview · star". */
export const EmailRow = memo(function EmailRow({ email, onToggleStar, showSentTime }: EmailRowProps) {
  const navigate = useNavigate();
  const open = () => navigate(`/emails/${email.id}`);

  return (
    <li
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(event) => event.key === 'Enter' && open()}
      className="group flex cursor-pointer items-center gap-4 border-b border-surface-line px-6 py-3.5 transition-colors hover:bg-surface-subtle focus:bg-surface-subtle focus:outline-none"
    >
      <span className="w-44 shrink-0 truncate text-sm text-ink-900" title={email.recipient}>
        <span className="text-ink-500">To: </span>
        {nameFromEmail(email.recipient)}
      </span>

      <StatusPill email={email} />

      <p className="min-w-0 flex-1 truncate text-sm">
        <span className="font-semibold text-ink-900">{email.subject}</span>
        {email.preview && <span className="text-ink-400"> - {email.preview}</span>}
      </p>

      {showSentTime && email.sentAt && (
        <time dateTime={email.sentAt} className="shrink-0 text-xs tabular-nums text-ink-400">
          {formatPillDate(email.sentAt)}
        </time>
      )}

      <button
        type="button"
        aria-label={email.starred ? 'Unstar' : 'Star'}
        aria-pressed={email.starred}
        onClick={(event) => {
          event.stopPropagation();
          onToggleStar(email);
        }}
        className={clsx(
          'shrink-0 rounded p-1 transition-all hover:scale-110',
          email.starred ? 'text-[#F5B400]' : 'text-ink-300 hover:text-ink-500',
        )}
      >
        <StarIcon size={17} filled={email.starred} />
      </button>
    </li>
  );
});
