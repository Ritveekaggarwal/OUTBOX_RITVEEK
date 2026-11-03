import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { EmailStatus, EmailSummary, Folder } from '../../types/api';
import { useDebounce } from '../../hooks/useDebounce';
import { useEmailList, useToggleStar } from '../../hooks/useEmails';
import { AlertIcon, ClockIcon, InboxIcon, SearchIcon, SendIcon } from '../icons';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { EmailRowSkeleton } from '../ui/Skeleton';
import { Spinner } from '../ui/Spinner';
import { useToast } from '../ui/Toast';
import { EmailRow } from './EmailRow';
import { SearchBar, type StatusFilterOption } from './SearchBar';

const FILTERS: Record<Folder, StatusFilterOption[]> = {
  scheduled: [
    { value: undefined, label: 'All scheduled' },
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'RATE_LIMITED', label: 'Throttled' },
    { value: 'SENDING', label: 'Sending' },
  ],
  sent: [
    { value: undefined, label: 'All sent' },
    { value: 'SENT', label: 'Delivered' },
    { value: 'FAILED', label: 'Failed' },
  ],
};

const EMPTY_COPY: Record<Folder, { title: string; description: string }> = {
  scheduled: {
    title: 'No scheduled emails',
    description: 'Compose a campaign and pick a start time. Your queued emails will show up here.',
  },
  sent: {
    title: 'Nothing sent yet',
    description: 'Emails appear here as soon as the worker delivers them through Ethereal.',
  },
};

/** Shared list screen for both folders (Scheduled / Sent). */
export function EmailListView({ folder }: { folder: Folder }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<EmailStatus | undefined>(undefined);
  const query = useDebounce(search.trim(), 300);
  const toast = useToast();
  const list = useEmailList(folder, query, status);
  const star = useToggleStar();
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch('');
    setStatus(undefined);
  }, [folder]);

  const emails = useMemo(() => list.data?.pages.flatMap((page) => page.items) ?? [], [list.data]);

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list;
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasNextPage) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const toggleStar = useCallback(
    (email: EmailSummary) =>
      star.mutate(
        { id: email.id, starred: !email.starred },
        { onError: () => toast.error('Could not update star') },
      ),
    [star, toast],
  );

  const isFiltering = Boolean(query || status);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SearchBar
        value={search}
        onChange={setSearch}
        status={status}
        statusOptions={FILTERS[folder]}
        onStatusChange={setStatus}
        onRefresh={() => void list.refetch()}
        refreshing={list.isFetching && !list.isPending && !isFetchingNextPage}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {list.isPending ? (
          <div aria-busy="true">
            {Array.from({ length: 8 }, (_, index) => (
              <EmailRowSkeleton key={index} />
            ))}
          </div>
        ) : list.isError ? (
          <EmptyState
            icon={<AlertIcon size={26} />}
            title="Could not load emails"
            description={list.error.message}
            action={<Button variant="outline" pill onClick={() => void list.refetch()}>Try again</Button>}
          />
        ) : emails.length === 0 ? (
          isFiltering ? (
            <EmptyState
              icon={<SearchIcon size={26} />}
              title="No matches"
              description="Try a different search term or clear the status filter."
              action={
                <Button variant="outline" pill onClick={() => { setSearch(''); setStatus(undefined); }}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={folder === 'scheduled' ? <ClockIcon size={26} /> : folder === 'sent' ? <SendIcon size={26} /> : <InboxIcon size={26} />}
              {...EMPTY_COPY[folder]}
              action={
                <Link to="/compose">
                  <Button pill>Compose new email</Button>
                </Link>
              }
            />
          )
        ) : (
          <>
            <ul>
              {emails.map((email) => (
                <EmailRow key={email.id} email={email} onToggleStar={toggleStar} showSentTime={folder === 'sent'} />
              ))}
            </ul>
            <div ref={sentinel} className="flex h-14 items-center justify-center text-brand-600">
              {isFetchingNextPage && <Spinner />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
