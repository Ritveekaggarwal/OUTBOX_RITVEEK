import { Link, NavLink } from 'react-router-dom';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import { useEmailStats } from '../../hooks/useEmails';
import { ClockIcon, SendIcon } from '../icons';
import { Logo } from './Logo';
import { UserMenu } from './UserMenu';

function NavItem({ to, icon, label, count }: { to: string; icon: ReactNode; label: string; count?: number }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          'group flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors',
          isActive ? 'bg-brand-50 font-semibold text-ink-900' : 'text-ink-700 hover:bg-surface-muted',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className={clsx(isActive ? 'text-ink-900' : 'text-ink-500')}>{icon}</span>
          <span className="flex-1">{label}</span>
          {count !== undefined && (
            <span className={clsx('text-xs tabular-nums', isActive ? 'text-ink-700' : 'text-ink-400')}>
              {count.toLocaleString()}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const { data: stats } = useEmailStats();

  return (
    <aside className="flex w-[248px] shrink-0 flex-col border-r border-surface-line bg-white px-4 pb-5 pt-5">
      <Link to="/scheduled" className="mb-5 px-1" aria-label="Home">
        <Logo />
      </Link>

      <UserMenu />

      <Link
        to="/compose"
        className="mt-4 flex h-10 items-center justify-center rounded-full border border-brand-600 text-sm font-medium text-brand-600 transition hover:bg-brand-50 active:scale-[0.98]"
      >
        Compose
      </Link>

      <p className="mb-2 mt-7 px-3 text-[11px] font-medium uppercase tracking-wider text-ink-400">Core</p>
      <nav className="flex flex-col gap-1" aria-label="Folders">
        <NavItem to="/scheduled" icon={<ClockIcon size={17} />} label="Scheduled" count={stats?.scheduled} />
        <NavItem to="/sent" icon={<SendIcon size={17} />} label="Sent" count={stats?.sent} />
      </nav>

      {stats && stats.rateLimited > 0 && (
        <div className="mt-auto rounded-xl border border-highlight-line/50 bg-highlight-bg p-3 text-xs text-[#854D0E]">
          <p className="font-semibold">{stats.rateLimited.toLocaleString()} throttled</p>
          <p className="mt-0.5 opacity-80">Hourly limit reached. They will send automatically in the next window.</p>
        </div>
      )}
    </aside>
  );
}
