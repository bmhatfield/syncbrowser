import { Link } from 'react-router-dom';

import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { useFolders } from '../hooks/useFolders';
import { shortDeviceID } from '../lib/format';

export function Folders() {
  const { data, isLoading, error } = useFolders();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (error) {
    return <p className="text-rose-400">Failed to load folders: {error.message}</p>;
  }
  if (!data) return null;

  const deviceNames = new Map(data.devices.map((d) => [d.deviceID, d.name || shortDeviceID(d.deviceID)]));

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Folders</h2>
      {data.folders.length === 0 && (
        <p className="text-slate-400">No folders configured.</p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {data.folders.map((f) => {
          const peers = f.devices
            .filter((d) => deviceNames.has(d.deviceID))
            .map((d) => deviceNames.get(d.deviceID)!)
            .filter((n, i, all) => all.indexOf(n) === i);
          return (
            <Card key={f.id}>
              <CardHeader className="flex items-center justify-between">
                <div>
                  <Link
                    to={`/folders/${encodeURIComponent(f.id)}/browse/`}
                    className="text-base font-medium text-sky-400 hover:underline"
                  >
                    {f.label || f.id}
                  </Link>
                  <p className="text-xs text-slate-500">{f.id}</p>
                </div>
                <Link
                  to={`/folders/${encodeURIComponent(f.id)}/needs`}
                  className="text-xs text-slate-300 hover:text-slate-100"
                >
                  Needs →
                </Link>
              </CardHeader>
              <CardBody className="space-y-2 text-sm">
                <Row label="Path" value={<code className="text-slate-300">{f.path}</code>} />
                <Row label="Type" value={f.type} />
                <Row label="Paused" value={f.paused ? 'yes' : 'no'} />
                <Row
                  label="Peers"
                  value={peers.length ? peers.join(', ') : <span className="text-slate-500">—</span>}
                />
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-16 shrink-0 text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-slate-200">{value}</span>
    </div>
  );
}
