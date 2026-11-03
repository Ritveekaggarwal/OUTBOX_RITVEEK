import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { slackApi } from '../api/endpoints';
import { queryKeys } from '../api/query-keys';

export function useSlackStatus() {
  return useQuery({ queryKey: queryKeys.slack, queryFn: slackApi.status, staleTime: 30_000 });
}

export function useSlackConnect() {
  return useMutation({
    mutationFn: slackApi.connect,
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });
}

export function useSlackDisconnect() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: slackApi.disconnect,
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.slack }),
  });
}

export function useSlackTest() {
  return useMutation({ mutationFn: slackApi.test });
}
