import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { ApiError } from '../api/http';
import {
  AlertIcon,
  ArrowLeftIcon,
  ClockIcon,
  ExternalLinkIcon,
  StarIcon,
  TrashIcon,
} from '../components/icons';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { IconButton } from '../components/ui/IconButton';
import { ConfirmDialog } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { StatusPill } from '../components/ui/StatusPill';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { useCancelEmail, useEmail, useToggleStar } from '../hooks/useEmails';
import { formatDetailDate, formatRelative } from '../utils/format';

const CANCELLABLE = new Set(['SCHEDULED', 'RATE_LIMITED']);

export function EmailDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { data: email, isPending, isError, error } = useEmail(id);
  const star = useToggleStar();
  const cancel = useCancelEmail();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Email bodies are user-authored HTML: always sanitise before rendering.
  const safeBody = useMemo(() => (email ? DOMPurify.sanitize(email.body) : ''), [email]);
  const backTo = email && ['SENT', 'FAILED'].includes(email.status) ? '/sent' : '/scheduled';

  if (isError) {
    return (
      <EmptyState
        icon={<AlertIcon size={26} />}
        title={error instanceof ApiError && error.status === 404 ? 'Email not found' : 'Could not load email'}
        description="It may have been cancelled or belongs to another account."
        action={<Link to="/scheduled"><Button variant="outline" pill>Back to inbox</Button></Link>}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-surface-line px-6 py-4">
        <IconButton label="Back" icon={<ArrowLeftIcon size={20} />} onClick={() => navigate(backTo)} className="-ml-2 text-ink-900" />
        {isPending ? (
          <Skeleton className="h-6 w-80" />
        ) : (
          <h1 className="min-w-0 flex-1 truncate text-xl font-medium text-ink-900">{email.subject}</h1>
        )}
        <div className="ml-auto flex items-center gap-1">
          {email && (
            <>
              <IconButton
                label={email.starred ? 'Unstar' : 'Star'}
                icon={<StarIcon size={18} filled={email.starred} className={email.starred ? 'text-[#F5B400]' : ''} />}
                onClick={() => star.mutate({ id: email.id, starred: !email.starred })}
              />
              {CANCELLABLE.has(email.status) && (
                <IconButton label="Cancel scheduled email" icon={<TrashIcon size={18} />} onClick={() => setConfirmOpen(true)} />
              )}
            </>
          )}
          <span className="mx-2 h-6 w-px bg-surface-line" />
          {user && <Avatar name={user.name} src={user.avatarUrl} size={30} />}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        {isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-72" />
            <Skeleton className="h-4 w-full max-w-xl" />
            <Skeleton className="h-4 w-full max-w-lg" />
          </div>
        ) : (
          <article className="max-w-4xl animate-fade-in">
            <div className="flex items-start gap-3">
              <Avatar name={email.sender.name} size={36} className="!bg-brand-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-semibold text-ink-900">{email.sender.name}</span>{' '}
                  <span className="text-xs text-ink-500">&lt;{email.sender.email}&gt;</span>
                </p>
                <p className="text-xs text-ink-500">to {email.recipient}</p>
              </div>
              <time className="shrink-0 text-xs text-ink-500" dateTime={email.sentAt ?? email.scheduledAt}>
                {formatDetailDate(email.sentAt ?? email.scheduledAt)}
              </time>
            </div>

            <div className="ml-12 mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-surface-line bg-surface-subtle px-4 py-3 text-xs text-ink-700">
              <StatusPill email={email} />
              {['SCHEDULED', 'RATE_LIMITED'].includes(email.status) && (
                <span className="inline-flex items-center gap-1">
                  <ClockIcon size={13} /> Sends {formatRelative(email.scheduledAt)}
                </span>
              )}
              {email.status === 'FAILED' && email.failedReason && (
                <span className="text-danger-text">{email.failedReason}</span>
              )}
              {email.attempts > 1 && <span>· {email.attempts} attempts</span>}
              {email.previewUrl && (
                <a
                  href={email.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto inline-flex items-center gap-1 font-medium text-brand-600 hover:underline"
                >
                  View in Ethereal <ExternalLinkIcon size={13} />
                </a>
              )}
            </div>

            <div className="email-body ml-12 mt-6 text-sm leading-relaxed text-ink-900" dangerouslySetInnerHTML={{ __html: safeBody }} />
          </article>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Cancel this email?"
        description="It will be removed from the queue and will not be sent. This cannot be undone."
        confirmLabel="Cancel email"
        tone="danger"
        loading={cancel.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() =>
          cancel.mutate(id, {
            onSuccess: () => {
              toast.success('Email cancelled');
              navigate('/scheduled');
            },
            onError: (err) => {
              setConfirmOpen(false);
              toast.error('Could not cancel', err instanceof ApiError ? err.message : undefined);
            },
          })
        }
      />
    </div>
  );
}
