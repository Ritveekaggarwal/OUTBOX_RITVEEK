import { useState } from 'react';
import clsx from 'clsx';
import { CheckIcon, ChevronDownIcon } from '../icons';
import { Popover } from './Popover';

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
}

export interface SelectProps {
  value: string | undefined;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel: string;
}

/** Compact pill dropdown (Figma "From" field). */
export function Select({ value, options, onChange, placeholder = 'Select', disabled, ariaLabel }: SelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <Popover
      open={open}
      onClose={() => setOpen(false)}
      className="max-h-72 w-72 overflow-y-auto p-1.5"
      trigger={
        <button
          type="button"
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          className="inline-flex h-8 max-w-[280px] items-center gap-2 rounded-md bg-surface-muted px-3 text-sm text-ink-900 transition hover:bg-surface-line disabled:opacity-50"
        >
          <span className={clsx('truncate', !selected && 'text-ink-400')}>{selected?.label ?? placeholder}</span>
          <ChevronDownIcon size={14} className="shrink-0 text-ink-500" />
        </button>
      }
    >
      <ul role="listbox" aria-label={ariaLabel}>
        {options.map((option) => (
          <li key={option.value}>
            <button
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-muted"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-ink-900">{option.label}</span>
                {option.hint && <span className="block truncate text-xs text-ink-400">{option.hint}</span>}
              </span>
              {option.value === value && <CheckIcon size={16} className="text-brand-600" />}
            </button>
          </li>
        ))}
      </ul>
    </Popover>
  );
}
