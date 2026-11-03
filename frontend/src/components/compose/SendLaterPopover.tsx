import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { toDateTimeLocal } from '../../utils/format';
import { CalendarIcon } from '../icons';
import { Button } from '../ui/Button';
import { Popover } from '../ui/Popover';

interface Preset {
  label: string;
  date: () => Date;
}

const atTomorrow = (hours: number) => () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hours, 0, 0, 0);
  return date;
};

const PRESETS: Preset[] = [
  { label: 'Now', date: () => new Date() },
  { label: 'Tomorrow', date: atTomorrow(9) },
  { label: 'Tomorrow, 10:00 AM', date: atTomorrow(10) },
  { label: 'Tomorrow, 11:00 AM', date: atTomorrow(11) },
  { label: 'Tomorrow, 3:00 PM', date: atTomorrow(15) },
];

export interface SendLaterPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  onSchedule: (startAt: Date) => void;
}

/** Figma "Send Later" panel: date-time picker, quick presets, Cancel / Done. */
export function SendLaterPopover({ open, onOpenChange: setOpen, disabled, loading, onSchedule }: SendLaterPopoverProps) {
  const [value, setValue] = useState('');
  const [presetLabel, setPresetLabel] = useState<string | null>(null);
  const minValue = useMemo(() => toDateTimeLocal(new Date()), [open]);

  const choose = (preset: Preset) => {
    setPresetLabel(preset.label);
    setValue(toDateTimeLocal(preset.date()));
  };

  const confirm = () => {
    const date = presetLabel === 'Now' ? new Date() : value ? new Date(value) : null;
    if (!date) return;
    onSchedule(date);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onClose={() => setOpen(false)}
      align="right"
      className="w-[290px] p-4"
      trigger={
        <Button
          variant="outline"
          size="sm"
          pill
          loading={loading}
          disabled={disabled}
          onClick={() => setOpen(!open)}
          className="h-8 px-4"
        >
          {open ? 'Send' : 'Send Later'}
        </Button>
      }
    >
      <p className="text-sm font-semibold text-ink-900">Send Later</p>

      <label className="mt-3 flex h-9 items-center gap-2 rounded-lg border border-surface-line px-3 text-sm focus-within:border-brand-500">
        <input
          type="datetime-local"
          value={value}
          min={minValue}
          onChange={(event) => {
            setValue(event.target.value);
            setPresetLabel(null);
          }}
          aria-label="Pick date & time"
          className={clsx(
            'flex-1 bg-transparent text-sm outline-none [&::-webkit-calendar-picker-indicator]:opacity-0',
            value ? 'text-ink-900' : 'text-ink-400',
          )}
        />
        <CalendarIcon size={15} className="pointer-events-none -ml-6 text-ink-400" />
      </label>

      <ul className="mt-2">
        {PRESETS.map((preset) => (
          <li key={preset.label}>
            <button
              type="button"
              onClick={() => choose(preset)}
              className={clsx(
                'w-full rounded-md px-2 py-2 text-left text-sm transition-colors',
                presetLabel === preset.label ? 'bg-brand-50 font-medium text-brand-700' : 'text-ink-700 hover:bg-surface-muted',
              )}
            >
              {preset.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center justify-end gap-3">
        <button type="button" onClick={() => setOpen(false)} className="px-2 text-sm text-ink-700 hover:text-ink-900">
          Cancel
        </button>
        <Button variant="outline" size="sm" pill disabled={!value && presetLabel !== 'Now'} onClick={confirm} className="h-8 px-5">
          Done
        </Button>
      </div>
    </Popover>
  );
}
