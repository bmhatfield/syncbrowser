import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { useFolders } from '../hooks/useFolders';
import { useNeed } from '../hooks/useNeed';
import { useRemoteNeed } from '../hooks/useRemoteNeed';
import type { STNeed } from '../lib/types';
import { formatBytes, formatDate, shortDeviceID } from '../lib/format';

type Tab = 'local' | 'remote';

export function Needs() {
  const params = useParams();
  const id = params.id ?? '';
  const folderID = decodeURIComponent(id);
  const folders = useFolders();
  const folder = folders.data?.folders.find((f) => f.id === folderID);

  const peers = useMemo(() => {
    if (!folders.data || !folder) return [];
    const names = new Map(folders.data.devices.map((d) => [d.deviceID, d.name || shortDeviceID(d.deviceID)]));
    return folder.devices
      .filter((d) => names.has(d.deviceID))
      .map((d) => ({ id: d.deviceID, name: names.get(d.deviceID)! }));
  }, [folders.data, folder]);

  const [tab, setTab] = useState<Tab>('local');
  const [device, setDevice] = useState<string>('');

  return (
    <div className="space-y-4">
      <nav className="text-sm text-slate-400">
        <Link to="/folders" className="hover:text-slate-200">All folders</Link>
        <span> › </span>
        <Link to={`/folders/${id}/browse/`} className="hover:text-slate-200">{folder?.label ?? folderID}</Link>
        <span> › </span>
        <span className="text-slate-200">Needs</span>
      </nav>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-md border border-slate-800 bg-slate-900/60 p-1 text-sm">
          <TabButton active={tab === 'local'} onClick={() => setTab('local')}>Local needs</TabButton>
          <TabButton active={tab === 'remote'} onClick={() => setTab('remote')}>Remote needs</TabButton>
        </div>
        {tab === 'remote' && (
          <select
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
            value={device}
            onChange={(e) => setDevice(e.target.value)}
          >
            <option value="">Choose a peer…</option>
            {peers.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {tab === 'local' ? (
        <LocalNeed folderID={folderID} />
      ) : (
        <RemoteNeed folderID={folderID} device={device} />
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded px-3 py-1 ' +
        (active ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200')
      }
    >
      {children}
    </button>
  );
}

function LocalNeed({ folderID }: { folderID: string }) {
  const q = useNeed(folderID);
  return <NeedTable label="Local needs" query={q} />;
}

function RemoteNeed({ folderID, device }: { folderID: string; device: string }) {
  const q = useRemoteNeed(folderID, device);
  if (!device) {
    return <p className="text-sm text-slate-400">Pick a peer above to see what they still need.</p>;
  }
  return <NeedTable label="Remote needs" query={q} />;
}

function NeedTable({
  label,
  query,
}: {
  label: string;
  query: { data?: STNeed; isLoading: boolean; error: unknown };
}) {
  if (query.isLoading) {
    return <div className="flex justify-center py-10"><Spinner className="h-5 w-5" /></div>;
  }
  if (query.error) {
    return <p className="text-rose-400">{(query.error as Error).message}</p>;
  }
  const data = query.data;
  if (!data) return null;
  const all = [
    ...data.progress.map((f) => ({ ...f, group: 'in progress' as const })),
    ...data.queued.map((f) => ({ ...f, group: 'queued' as const })),
    ...data.rest.map((f) => ({ ...f, group: 'pending' as const })),
  ];
  if (all.length === 0) {
    return <p className="text-sm text-slate-400">{label}: nothing pending. Fully in sync.</p>;
  }
  return (
    <Card className="overflow-hidden">
      <table className="w-full divide-y divide-slate-800 text-sm">
        <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-4 py-2 text-left font-normal">Name</th>
            <th className="px-4 py-2 text-left font-normal">Group</th>
            <th className="px-4 py-2 text-right font-normal">Size</th>
            <th className="px-4 py-2 text-right font-normal">Modified</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {all.map((f) => (
            <tr key={`${f.group}:${f.name}`} className="hover:bg-slate-800/50">
              <td className="px-4 py-2 text-slate-200">{f.name}</td>
              <td className="px-4 py-2 text-slate-400">{f.group}</td>
              <td className="px-4 py-2 text-right tabular-nums text-slate-300">{formatBytes(f.size)}</td>
              <td className="px-4 py-2 text-right tabular-nums text-slate-400">{formatDate(f.modified)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
