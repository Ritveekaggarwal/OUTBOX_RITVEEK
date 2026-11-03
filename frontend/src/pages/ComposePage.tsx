import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../api/http';
import { RecipientInput, type RecipientInputHandle } from '../components/compose/RecipientInput';
import { RichTextEditor } from '../components/compose/RichTextEditor';
import { SendLaterPopover } from '../components/compose/SendLaterPopover';
import { ArrowLeftIcon, ClockIcon, PaperclipIcon } from '../components/icons';
import { IconButton } from '../components/ui/IconButton';
import { Select } from '../components/ui/Select';
import { useToast } from '../components/ui/Toast';
import { useScheduleEmails, useSenders } from '../hooks/useEmails';

interface ComposeState {
  senderId: string | undefined;
  recipients: string[];
  subject: string;
  body: string;
  bodyEmpty: boolean;
  delaySeconds: string;
  hourlyLimit: string;
}

const INITIAL: ComposeState = {
  senderId: undefined,
  recipients: [],
  subject: '',
  body: '',
  bodyEmpty: true,
  delaySeconds: '',
  hourlyLimit: '',
};

function Row({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-start gap-4 border-b border-surface-line py-3 ${className}`}>
      <span className="w-14 shrink-0 pt-1.5 text-xs text-ink-500">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function NumberBox({ id, label, value, onChange, placeholder }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-3 text-xs text-ink-500">
      {label}
      <input
        id={id}
        inputMode="numeric"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
        className="h-8 w-16 rounded-md border border-surface-line bg-white px-2.5 text-sm text-ink-900 outline-none transition placeholder:text-ink-300 focus:border-brand-500"
      />
    </label>
  );
}

/** Validation kept on the client for instant feedback; the API re-validates everything. */
function validate(state: ComposeState): string | null {
  if (!state.senderId) return 'Choose a sender in "From"';
  if (state.recipients.length === 0) return 'Add at least one recipient or upload a lead list';
  if (!state.subject.trim()) return 'Subject is required';
  if (state.bodyEmpty) return 'Write the email body';
  if (!state.hourlyLimit || Number(state.hourlyLimit) < 1) return 'Set an hourly limit of at least 1';
  return null;
}

export function ComposePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const senders = useSenders();
  const schedule = useScheduleEmails();
  const [state, setState] = useState<ComposeState>(INITIAL);
  const [sendLaterOpen, setSendLaterOpen] = useState(false);
  const recipientsRef = useRef<RecipientInputHandle>(null);

  const set = <K extends keyof ComposeState>(key: K, value: ComposeState[K]) =>
    setState((current) => ({ ...current, [key]: value }));

  // Default "From" to the first available sender.
  useEffect(() => {
    if (!state.senderId && senders.data?.[0]) set('senderId', senders.data[0].id);
  }, [senders.data, state.senderId]);

  const submit = (startAt: Date) => {
    const problem = validate(state);
    if (problem) {
      toast.error('Cannot schedule yet', problem);
      return;
    }
    schedule.mutate(
      {
        senderId: state.senderId!,
        recipients: state.recipients,
        subject: state.subject.trim(),
        body: state.body,
        startAt: startAt.toISOString(),
        delayBetweenEmailsSeconds: Number(state.delaySeconds || 0),
        hourlyLimit: Number(state.hourlyLimit),
      },
      {
        onSuccess: (result) => {
          toast.success(
            `${result.scheduledCount.toLocaleString()} email${result.scheduledCount === 1 ? '' : 's'} scheduled`,
            result.duplicatesRemoved ? `${result.duplicatesRemoved} duplicate address(es) skipped` : undefined,
          );
          navigate('/scheduled');
        },
        onError: (error) => toast.error('Scheduling failed', error instanceof ApiError ? error.message : undefined),
      },
    );
  };

  return (
    <div className="flex h-screen flex-col bg-white">
      <header className="flex items-center gap-3 px-6 py-4">
        <IconButton label="Back" icon={<ArrowLeftIcon size={20} />} onClick={() => navigate(-1)} className="-ml-2 text-ink-900" />
        <h1 className="text-xl font-medium text-ink-900">Compose New Email</h1>
        <div className="ml-auto flex items-center gap-1">
          <IconButton label="Attach lead list (CSV / TXT)" icon={<PaperclipIcon size={18} />} onClick={() => recipientsRef.current?.openFilePicker()} />
          <IconButton label="Schedule" icon={<ClockIcon size={18} />} onClick={() => setSendLaterOpen(true)} />
          <div className="ml-2">
            <SendLaterPopover
              open={sendLaterOpen}
              onOpenChange={setSendLaterOpen}
              loading={schedule.isPending}
              onSchedule={submit}
            />
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto pb-16">
        <div className="mx-auto w-full max-w-[860px] px-6">
          <Row label="From">
            <Select
              ariaLabel="From"
              value={state.senderId}
              disabled={senders.isPending}
              placeholder={senders.isPending ? 'Loading senders…' : 'No senders available'}
              onChange={(value) => set('senderId', value)}
              options={(senders.data ?? []).map((sender) => ({ value: sender.id, label: sender.email, hint: sender.name }))}
            />
          </Row>

          <Row label="To">
            <RecipientInput
              ref={recipientsRef}
              recipients={state.recipients}
              onChange={(recipients) => set('recipients', recipients)}
              onError={(message) => toast.error(message)}
            />
          </Row>

          <Row label="Subject">
            <input
              value={state.subject}
              onChange={(event) => set('subject', event.target.value)}
              placeholder="Subject"
              maxLength={255}
              aria-label="Subject"
              className="h-8 w-full bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
            />
          </Row>

          <div className="flex flex-wrap items-center gap-8 py-4">
            <NumberBox
              id="delay"
              label="Delay between 2 emails"
              value={state.delaySeconds}
              onChange={(value) => set('delaySeconds', value)}
              placeholder="00"
            />
            <NumberBox
              id="hourly-limit"
              label="Hourly Limit"
              value={state.hourlyLimit}
              onChange={(value) => set('hourlyLimit', value)}
              placeholder="00"
            />
            <span className="text-[11px] text-ink-400">Delay in seconds · limit in emails per hour</span>
          </div>

          <RichTextEditor onChange={(html, isEmpty) => setState((current) => ({ ...current, body: html, bodyEmpty: isEmpty }))} />
        </div>
      </div>
    </div>
  );
}
