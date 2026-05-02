import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Download,
  Upload,
} from 'lucide-react';

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
      <nav className="flex flex-wrap items-center gap-1 text-sm text-fg-subtle">
        <Link to="/folders" className="hover:text-fg">All folders</Link>
        <ChevronRight className="size-3.5 text-fg-faintest" aria-hidden="true" />
        <Link to={`/folders/${id}/browse/`} className="hover:text-fg">{folder?.label ?? folderID}</Link>
        <ChevronRight className="size-3.5 text-fg-faintest" aria-hidden="true" />
        <span className="text-fg">Needs</span>
      </nav>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-md border border-border bg-surface/60 p-1 text-sm">
          <TabButton active={tab === 'local'} onClick={() => setTab('local')}>
            <Download className="size-3.5" aria-hidden="true" />
            Local needs
          </TabButton>
          <TabButton active={tab === 'remote'} onClick={() => setTab('remote')}>
            <Upload className="size-3.5" aria-hidden="true" />
            Remote needs
          </TabButton>
        </div>
        {tab === 'remote' && (
          <select
            className="rounded-md border border-border-strong bg-surface px-2 py-1.5 text-sm text-fg"
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
        'flex items-center gap-1.5 rounded px-3 py-1 ' +
        (active ? 'bg-surface-2 text-fg' : 'text-fg-subtle hover:text-fg')
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
    return <p className="text-sm text-fg-subtle">Pick a peer above to see what they still need.</p>;
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
    return <div className="flex justify-center py-10"><Spinner className="size-5" /></div>;
  }
  if (query.error) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-sm text-error">
        <AlertCircle className="size-8" aria-hidden="true" />
        <p>{(query.error as Error).message}</p>
      </div>
    );
  }
  const data = query.data;
  if (!data) return null;
  const all = [
    ...(data.progress ?? []).map((f) => ({ ...f, group: 'in progress' as const })),
    ...(data.queued ?? []).map((f) => ({ ...f, group: 'queued' as const })),
    ...(data.rest ?? []).map((f) => ({ ...f, group: 'pending' as const })),
  ];
  if (all.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-sm text-fg-subtle">
        <CheckCircle2 className="size-8 text-success" aria-hidden="true" />
        <p>{label}: nothing pending. Fully in sync.</p>
      </div>
    );
  }
  return (
    <Card className="overflow-hidden">
      <table className="w-full divide-y divide-border text-sm">
        <thead className="bg-surface/60 text-xs uppercase tracking-wide text-fg-subtle">
          <tr>
            <th className="px-4 py-2 text-left font-normal">Name</th>
            <th className="px-4 py-2 text-left font-normal">Group</th>
            <th className="px-4 py-2 text-right font-normal">Size</th>
            <th className="px-4 py-2 text-right font-normal">Modified</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {all.map((f) => (
            <tr key={`${f.group}:${f.name}`} className="hover:bg-surface-2/50">
              <td className="px-4 py-2 text-fg">{f.name}</td>
              <td className="px-4 py-2 text-fg-subtle">{f.group}</td>
              <td className="px-4 py-2 text-right tabular-nums text-fg-muted">{formatBytes(f.size)}</td>
              <td className="px-4 py-2 text-right tabular-nums text-fg-subtle">{formatDate(f.modified)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
