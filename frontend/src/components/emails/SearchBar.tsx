import { useState } from 'react';
import clsx from 'clsx';
import type { EmailStatus } from '../../types/api';
import { CheckIcon, FilterIcon, RefreshIcon, SearchIcon, CloseIcon } from '../icons';
import { IconButton } from '../ui/IconButton';
import { Popover } from '../ui/Popover';

export interface StatusFilterOption {
  value: EmailStatus | undefined;
  label: string;
}

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  status: EmailStatus | undefined;
  statusOptions: StatusFilterOption[];
  onStatusChange: (status: EmailStatus | undefined) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export function SearchBar({
  value,
  onChange,
  status,
  statusOptions,
  onStatusChange,
  onRefresh,
  refreshing,
}: SearchBarProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 px-6 pb-3 pt-5">
      <label className="flex h-10 flex-1 items-center gap-2 rounded-full bg-surface-muted px-4 text-ink-400 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500/25">
        <SearchIcon size={17} />
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search"
          aria-label="Search emails"
          className="h-full flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400 [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button type="button" aria-label="Clear search" onClick={() => onChange('')} className="rounded-full p-0.5 hover:text-ink-700">
            <CloseIcon size={14} />
          </button>
        )}
      </label>

      <Popover
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        align="right"
        className="w-48 p-1.5"
        trigger={
          <div className="relative">
            <IconButton label="Filter by status" icon={<FilterIcon size={18} />} active={filterOpen} onClick={() => setFilterOpen((o) => !o)} />
            {status && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-600 ring-2 ring-white" />}
          </div>
        }
      >
        {statusOptions.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => {
              onStatusChange(option.value);
              setFilterOpen(false);
            }}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-surface-muted"
          >
            {option.label}
            {option.value === status && <CheckIcon size={15} className="text-brand-600" />}
          </button>
        ))}
      </Popover>

      <IconButton
        label="Refresh"
        onClick={onRefresh}
        icon={<RefreshIcon size={18} className={clsx(refreshing && 'animate-spin')} />}
      />
    </div>
  );
}
