import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { emailsApi, sendersApi } from '../api/endpoints';
import { queryKeys } from '../api/query-keys';
import type { EmailStatus, Folder, ScheduleRequest } from '../types/api';

const LIVE_REFRESH_MS = 5_000;

export function useEmailList(folder: Folder, q: string, status?: EmailStatus) {
  return useInfiniteQuery({
    queryKey: queryKeys.emails(folder, q, status),
    queryFn: ({ pageParam, signal }) =>
      emailsApi.list({ folder, q: q || undefined, status, cursor: pageParam, limit: 25 }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchInterval: LIVE_REFRESH_MS,
    placeholderData: (previous) => previous,
  });
}

export function useEmailStats() {
  return useQuery({ queryKey: queryKeys.stats, queryFn: emailsApi.stats, refetchInterval: LIVE_REFRESH_MS });
}

export function useEmail(id: string) {
  return useQuery({ queryKey: queryKeys.email(id), queryFn: () => emailsApi.get(id), refetchInterval: LIVE_REFRESH_MS });
}

export function useSenders() {
  return useQuery({ queryKey: queryKeys.senders, queryFn: sendersApi.list, staleTime: 5 * 60_000 });
}

export function useScheduleEmails() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: ScheduleRequest) => emailsApi.schedule(payload),
    onSuccess: () => client.invalidateQueries({ queryKey: ['emails'] }),
  });
}

export function useToggleStar() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, starred }: { id: string; starred: boolean }) => emailsApi.setStarred(id, starred),
    onSettled: (_data, _error, { id }) => {
      void client.invalidateQueries({ queryKey: queryKeys.emailLists });
      void client.invalidateQueries({ queryKey: queryKeys.email(id) });
    },
  });
}

export function useCancelEmail() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => emailsApi.cancel(id),
    onSuccess: () => client.invalidateQueries({ queryKey: ['emails'] }),
  });
}
