import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, Folder, FolderX, Users } from 'lucide-react';

import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { useFolders } from '../hooks/useFolders';
import { shortDeviceID } from '../lib/format';

export function Folders() {
  const { data, isLoading, error } = useFolders();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="size-6" />
      </div>
    );
  }
  if (error) {
    return (
      <p className="flex items-center gap-1.5 text-rose-400">
        <AlertCircle className="size-4" aria-hidden="true" />
        Failed to load folders: {error.message}
      </p>
    );
  }
  if (!data) return null;

  const deviceNames = new Map(data.devices.map((d) => [d.deviceID, d.name || shortDeviceID(d.deviceID)]));

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Folders</h2>
      {data.folders.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-slate-500">
          <FolderX className="size-8 text-slate-600" aria-hidden="true" />
          <p>No folders configured.</p>
        </div>
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
                    className="flex items-center gap-1.5 text-base font-medium text-sky-400 hover:underline"
                  >
                    <Folder className="size-4" aria-hidden="true" />
                    {f.label || f.id}
                  </Link>
                  <p className="ml-5 text-xs text-slate-500">{f.id}</p>
                </div>
                <Link
                  to={`/folders/${encodeURIComponent(f.id)}/needs`}
                  className="flex items-center gap-1 text-xs text-slate-300 hover:text-slate-100"
                >
                  Needs
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </CardHeader>
              <CardBody className="space-y-2 text-sm">
                <Row label="Path" value={<code className="text-slate-300">{f.path}</code>} />
                <Row label="Type" value={f.type} />
                <Row label="Paused" value={f.paused ? 'yes' : 'no'} />
                <Row
                  label={
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5" aria-hidden="true" />
                      Peers
                    </span>
                  }
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

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-16 shrink-0 text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-slate-200">{value}</span>
    </div>
  );
}
