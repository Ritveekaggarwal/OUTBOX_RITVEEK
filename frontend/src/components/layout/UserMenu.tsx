import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSlackConnect, useSlackDisconnect, useSlackStatus, useSlackTest } from '../../hooks/useSlack';
import { ApiError } from '../../api/http';
import { ChevronDownIcon, LogoutIcon, SendIcon, SlackIcon, CloseIcon } from '../icons';
import { Avatar } from '../ui/Avatar';
import { MenuItem, Popover } from '../ui/Popover';
import { useToast } from '../ui/Toast';

const errorMessage = (error: unknown) => (error instanceof ApiError ? error.message : 'Please try again');

/** Figma user card in the sidebar; opens a menu with Slack controls and logout. */
export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const slack = useSlackStatus();
  const connect = useSlackConnect();
  const disconnect = useSlackDisconnect();
  const test = useSlackTest();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <Popover
      open={open}
      onClose={() => setOpen(false)}
      className="w-[260px] p-1.5"
      trigger={
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          className="flex w-full items-center gap-2.5 rounded-xl bg-surface-muted px-2.5 py-2 text-left transition hover:bg-surface-line"
        >
          <Avatar name={user.name} src={user.avatarUrl} size={32} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink-900">{user.name}</span>
            <span className="block truncate text-[11px] text-ink-500">{user.email}</span>
          </span>
          <ChevronDownIcon size={16} className={`shrink-0 text-ink-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      }
    >
      <div className="px-3 pb-2 pt-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Slack alerts</p>
        <p className="mt-0.5 text-xs text-ink-500">
          {slack.data?.connected
            ? `Connected to ${slack.data.channel} · ${slack.data.teamName}`
            : 'Get notified when an hourly limit is hit'}
        </p>
      </div>
      {slack.data?.connected ? (
        <>
          <MenuItem
            icon={<SendIcon size={16} />}
            disabled={test.isPending}
            onClick={() =>
              test.mutate(undefined, {
                onSuccess: () => toast.success('Test message sent to Slack'),
                onError: (error) => toast.error('Slack test failed', errorMessage(error)),
              })
            }
          >
            Send test alert
          </MenuItem>
          <MenuItem
            icon={<CloseIcon size={16} />}
            disabled={disconnect.isPending}
            onClick={() =>
              disconnect.mutate(undefined, {
                onSuccess: () => toast.info('Slack disconnected'),
                onError: (error) => toast.error('Could not disconnect', errorMessage(error)),
              })
            }
          >
            Disconnect Slack
          </MenuItem>
        </>
      ) : (
        <MenuItem
          icon={<SlackIcon size={16} />}
          disabled={connect.isPending || slack.data?.configured === false}
          onClick={() => connect.mutate(undefined, { onError: (error) => toast.error('Slack unavailable', errorMessage(error)) })}
        >
          {slack.data?.configured === false ? 'Slack not configured on server' : 'Connect Slack'}
        </MenuItem>
      )}
      <div className="my-1.5 h-px bg-surface-line" />
      <MenuItem icon={<LogoutIcon size={16} />} tone="danger" onClick={handleLogout}>
        Log out
      </MenuItem>
    </Popover>
  );
}
