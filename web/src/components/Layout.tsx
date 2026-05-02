import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, FolderTree, LogOut } from 'lucide-react';

import { useAuthStatus, useLogout } from '../hooks/useAuth';
import { eventsEnabled, setEventsEnabled, useEvents } from '../hooks/useEvents';
import { Button } from './ui/Button';
import { Spinner } from './ui/Spinner';
import { DeviceStatus } from './DeviceStatus';
import { RecentChanges } from './RecentChanges';

export function Layout() {
  const status = useAuthStatus();
  const logout = useLogout();
  const navigate = useNavigate();
  const [liveOn, setLiveOn] = useState(() => eventsEnabled());

  useEvents(liveOn);

  useEffect(() => {
    if (status.data && !status.data.authenticated) {
      navigate('/login', { replace: true });
    }
  }, [status.data, navigate]);

  if (status.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }
  if (!status.data?.authenticated) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-canvas/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link
            to="/folders"
            className="flex items-center gap-2 text-lg font-semibold text-primary"
          >
            <FolderTree className="size-5" aria-hidden="true" />
            syncbrowser
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <NavTab to="/folders">Folders</NavTab>
            <NavTab to="/devices">Devices</NavTab>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <label className="flex items-center gap-2 text-fg-muted">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={liveOn}
                onChange={(e) => {
                  setLiveOn(e.target.checked);
                  setEventsEnabled(e.target.checked);
                }}
              />
              <Activity
                className={'size-3.5 ' + (liveOn ? 'text-primary' : 'text-fg-faintest')}
                aria-hidden="true"
              />
              Live updates
            </label>
            <Button
              variant="secondary"
              onClick={() => {
                void logout.mutateAsync().then(() => {
                  navigate('/login', { replace: true });
                });
              }}
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </Button>
          </div>
        </div>
        <DeviceStatus />
        <RecentChanges live={liveOn} />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

function NavTab({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        'rounded-md px-2 py-1 text-fg-muted hover:bg-surface-2 hover:text-fg ' +
        (isActive ? 'bg-surface-2 text-fg' : '')
      }
    >
      {children}
    </NavLink>
  );
}
