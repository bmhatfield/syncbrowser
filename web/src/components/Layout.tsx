import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuthStatus, useLogout } from '../hooks/useAuth';
import { eventsEnabled, setEventsEnabled, useEvents } from '../hooks/useEvents';
import { Button } from './ui/Button';
import { Spinner } from './ui/Spinner';

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
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (!status.data?.authenticated) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/folders" className="text-lg font-semibold text-sky-400">
            syncbrowser
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <NavTab to="/folders">Folders</NavTab>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <label className="flex items-center gap-2 text-slate-300">
              <input
                type="checkbox"
                className="size-4 accent-sky-500"
                checked={liveOn}
                onChange={(e) => {
                  setLiveOn(e.target.checked);
                  setEventsEnabled(e.target.checked);
                }}
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
              Sign out
            </Button>
          </div>
        </div>
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
        'rounded-md px-2 py-1 text-slate-300 hover:bg-slate-800 hover:text-slate-100 ' +
        (isActive ? 'bg-slate-800 text-slate-100' : '')
      }
    >
      {children}
    </NavLink>
  );
}
