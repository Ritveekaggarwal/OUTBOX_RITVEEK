import { forwardRef, useImperativeHandle, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { extractEmails, isValidEmail, parseLeadFile } from '../../utils/leads';
import { CloseIcon, UploadIcon, UsersIcon } from '../icons';
import { Spinner } from '../ui/Spinner';

const VISIBLE_CHIPS = 3;

export interface RecipientInputProps {
  recipients: string[];
  onChange: (recipients: string[]) => void;
  onError: (message: string) => void;
}

export interface RecipientInputHandle {
  openFilePicker: () => void;
}

/** "To" row: chips (first 3 + "+N"), free typing, and CSV/TXT lead upload. */
export const RecipientInput = forwardRef<RecipientInputHandle, RecipientInputProps>(function RecipientInput(
  { recipients, onChange, onError },
  ref,
) {
  const [draft, setDraft] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [lastUpload, setLastUpload] = useState<{ name: string; count: number } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({ openFilePicker: () => fileInput.current?.click() }), []);

  const merge = (incoming: string[]) => onChange([...new Set([...recipients, ...incoming])]);

  const commitDraft = () => {
    const found = extractEmails(draft);
    if (found.length === 0) {
      if (draft.trim()) onError(`"${draft.trim()}" is not a valid email`);
      return;
    }
    merge(found);
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (['Enter', ',', ' ', 'Tab'].includes(event.key) && draft.trim()) {
      if (event.key !== 'Tab') event.preventDefault();
      commitDraft();
    } else if (event.key === 'Backspace' && !draft && recipients.length > 0) {
      onChange(recipients.slice(0, -1));
    }
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setParsing(true);
    try {
      const emails = await parseLeadFile(file);
      if (emails.length === 0) {
        onError('No email addresses found in that file');
        return;
      }
      merge(emails);
      setLastUpload({ name: file.name, count: emails.length });
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not read file');
    } finally {
      setParsing(false);
    }
  };

  const visible = expanded ? recipients : recipients.slice(0, VISIBLE_CHIPS);
  const hidden = recipients.length - visible.length;

  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="flex min-h-8 flex-1 flex-wrap items-center gap-1.5">
          {visible.map((email) => (
            <span
              key={email}
              className="group inline-flex h-6 animate-fade-in items-center gap-1 rounded-full border border-brand-600 bg-white pl-2.5 pr-1 text-xs text-ink-900"
            >
              {email}
              <button
                type="button"
                aria-label={`Remove ${email}`}
                onClick={() => onChange(recipients.filter((item) => item !== email))}
                className="rounded-full p-0.5 text-ink-400 opacity-60 transition hover:bg-brand-50 hover:text-ink-900 group-hover:opacity-100"
              >
                <CloseIcon size={11} />
              </button>
            </span>
          ))}
          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex h-6 items-center rounded-full border border-brand-600 bg-brand-50 px-2.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
            >
              +{hidden.toLocaleString()}
            </button>
          )}
          {expanded && recipients.length > VISIBLE_CHIPS && (
            <button type="button" onClick={() => setExpanded(false)} className="text-xs text-ink-500 underline-offset-2 hover:underline">
              Show less
            </button>
          )}
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => draft.trim() && commitDraft()}
            onPaste={(event) => {
              const text = event.clipboardData.getData('text');
              if (text.includes('@') && /[\s,;]/.test(text.trim())) {
                event.preventDefault();
                merge(extractEmails(text));
              }
            }}
            placeholder={recipients.length === 0 ? 'recipient@example.com' : ''}
            aria-label="Add recipient"
            className="h-8 min-w-[180px] flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
          />
        </div>

        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={parsing}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:opacity-60"
        >
          {parsing ? <Spinner size={14} /> : <UploadIcon size={16} />}
          Upload List
        </button>
        <input ref={fileInput} type="file" accept=".csv,.txt,text/csv,text/plain" hidden onChange={onFile} />
      </div>

      {recipients.length > 0 && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-500">
          <UsersIcon size={13} className="text-brand-600" />
          <span>
            <strong className="font-semibold text-ink-900">{recipients.length.toLocaleString()}</strong>{' '}
            email{recipients.length === 1 ? '' : 's'} detected
            {lastUpload && ` · ${lastUpload.count.toLocaleString()} from ${lastUpload.name}`}
          </span>
          {!recipients.every(isValidEmail) && <span className="text-danger-text">· some addresses look invalid</span>}
        </p>
      )}
    </div>
  );
});
