import { useEffect } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../api/query-keys';
import { useToast } from '../ui/Toast';
import { Sidebar } from './Sidebar';

const SLACK_MESSAGES: Record<string, ['success' | 'error' | 'info', string]> = {
  connected: ['success', 'Slack connected. Rate-limit alerts will be posted there.'],
  cancelled: ['info', 'Slack connection cancelled'],
  error: ['error', 'Slack connection failed, please try again'],
};

export function AppLayout() {
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const client = useQueryClient();

  // Result of the Slack OAuth redirect.
  useEffect(() => {
    const result = params.get('slack');
    if (!result) return;
    const message = SLACK_MESSAGES[result];
    if (message) toast[message[0]](message[1]);
    void client.invalidateQueries({ queryKey: queryKeys.slack });
    params.delete('slack');
    setParams(params, { replace: true });
  }, [params, setParams, toast, client]);

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
