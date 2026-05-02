import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowDown,
  ArrowDownUp,
  ArrowRight,
  ArrowUp,
  Eye,
  Folder,
  FolderX,
  HardDriveDownload,
  Loader2,
  Lock,
  ShieldAlert,
  ShieldOff,
  Trash2,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Pill } from '../components/ui/Pill';
import { Spinner } from '../components/ui/Spinner';
import { useFolders } from '../hooks/useFolders';
import { useFolderStatus } from '../hooks/useFolderStatus';
import type { STDevice, STFolder, STFolderDevice, STFolderStatus } from '../lib/types';
import { formatBytes, shortDeviceID } from '../lib/format';

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
      <p className="flex items-center gap-1.5 text-error">
        <AlertCircle className="size-4" aria-hidden="true" />
        Failed to load folders: {error.message}
      </p>
    );
  }
  if (!data) return null;

  const devicesByID = new Map(data.devices.map((d) => [d.deviceID, d]));

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Folders</h2>
      {data.folders.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-fg-faint">
          <FolderX className="size-8 text-fg-faintest" aria-hidden="true" />
          <p>No folders configured.</p>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {data.folders.map((f) => (
          <FolderCard key={f.id} folder={f} devicesByID={devicesByID} />
        ))}
      </div>
    </div>
  );
}

function FolderCard({
  folder: f,
  devicesByID,
}: {
  folder: STFolder;
  devicesByID: Map<string, STDevice>;
}) {
  return (
    <Card>
      <CardHeader className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              to={`/folders/${encodeURIComponent(f.id)}/browse/`}
              className="flex items-center gap-1.5 text-base font-medium text-primary hover:underline"
            >
              <Folder className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{f.label || f.id}</span>
            </Link>
            {f.paused && <Pill tone="amber">Paused</Pill>}
            {f.ignoreDelete && <Pill tone="rose" Icon={Trash2}>Deletes ignored</Pill>}
            {f.disableFsync && <Pill tone="amber" Icon={HardDriveDownload}>fsync off</Pill>}
            {f.ignorePerms && <Pill tone="slate" Icon={ShieldOff}>Perms ignored</Pill>}
          </div>
          <p className="ml-5 truncate text-xs text-fg-faint" title={f.id}>{f.id}</p>
        </div>
        <Link
          to={`/folders/${encodeURIComponent(f.id)}/needs`}
          className="flex shrink-0 items-center gap-1 text-xs text-fg-muted hover:text-fg"
        >
          Needs
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardBody className="space-y-2 text-sm">
        <Row label="Path" value={<code className="text-fg-muted">{f.path}</code>} />
        <Row label="Type" value={<FolderType type={f.type} />} />
        <Row label="Versioning" value={versioningLabel(f.versioning?.type)} />
        <Row label="Watcher" value={watcherLabel(f.fsWatcherEnabled, f.rescanIntervalS)} />
        <Row label="Min free" value={minDiskFreeLabel(f.minDiskFree)} />
        <Row
          label={
            <span className="flex items-center gap-1">
              <Users className="size-3.5" aria-hidden="true" />
              Peers
            </span>
          }
          value={<PeerList folderDevices={f.devices} devicesByID={devicesByID} />}
        />
        <FolderStatus folderID={f.id} />
      </CardBody>
    </Card>
  );
}

function Row({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-20 shrink-0 text-xs uppercase tracking-wide text-fg-faint">{label}</span>
      <span className="min-w-0 flex-1 text-fg">{value}</span>
    </div>
  );
}

function FolderType({ type }: { type: string }) {
  const meta = folderTypeMeta(type);
  return (
    <span className="flex items-center gap-1.5">
      {meta.icon}
      {meta.label}
    </span>
  );
}

function folderTypeMeta(type: string): { label: string; icon: ReactNode } {
  switch (type) {
    case 'sendreceive':
      return {
        label: 'Send & Receive',
        icon: <ArrowDownUp className="size-3.5 text-fg-subtle" aria-hidden="true" />,
      };
    case 'sendonly':
      return {
        label: 'Send Only',
        icon: <ArrowUp className="size-3.5 text-fg-subtle" aria-hidden="true" />,
      };
    case 'receiveonly':
      return {
        label: 'Receive Only',
        icon: <ArrowDown className="size-3.5 text-fg-subtle" aria-hidden="true" />,
      };
    case 'receiveencrypted':
      return {
        label: 'Receive Encrypted',
        icon: <Lock className="size-3.5 text-fg-subtle" aria-hidden="true" />,
      };
    default:
      return { label: type || '—', icon: null };
  }
}

function versioningLabel(t: string | undefined): string {
  if (!t) return 'Off';
  switch (t) {
    case 'simple': return 'Simple';
    case 'staggered': return 'Staggered';
    case 'trashcan': return 'Trashcan';
    case 'external': return 'External';
    default: return t;
  }
}

function watcherLabel(enabled: boolean | undefined, rescanIntervalS: number | undefined): ReactNode {
  const rescan = formatInterval(rescanIntervalS);
  if (enabled && rescan) return `Live · ${rescan} rescan`;
  if (enabled) return 'Live';
  if (rescan) return `${rescan} rescan`;
  return '—';
}

function formatInterval(seconds: number | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  if (seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds % 60 === 0) return `${seconds / 60}m`;
  return `${seconds}s`;
}

function minDiskFreeLabel(m: { value: number; unit: string } | undefined): string {
  if (!m?.value) return '—';
  return `${m.value}${m.unit}`;
}

function PeerList({
  folderDevices,
  devicesByID,
}: {
  folderDevices: STFolderDevice[];
  devicesByID: Map<string, STDevice>;
}) {
  if (folderDevices.length === 0) return <span className="text-fg-faint">—</span>;
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1">
      {folderDevices.map((fd) => {
        const dev = devicesByID.get(fd.deviceID);
        if (!dev) return null;
        const name = dev.name || shortDeviceID(dev.deviceID);
        const encrypted = (fd.encryptionPassword ?? '') !== '';
        return (
          <li key={fd.deviceID} className="flex items-center gap-1">
            <span className={dev.paused ? 'text-fg-faint line-through' : 'text-fg'}>
              {name}
            </span>
            {encrypted && (
              <Pill tone="sky" Icon={Lock}>encrypted</Pill>
            )}
            {dev.untrusted && (
              <Pill tone="rose" Icon={ShieldAlert}>untrusted</Pill>
            )}
            {dev.paused && (
              <Pill tone="slate" Icon={Eye}>paused</Pill>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function FolderStatus({ folderID }: { folderID: string }) {
  const { data, isLoading, error } = useFolderStatus(folderID);
  if (isLoading) {
    return (
      <div className="border-t border-border/60 pt-2 text-xs text-fg-faint">
        <Spinner className="inline-block size-3" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center gap-1.5 border-t border-border/60 pt-2 text-xs text-error">
        <AlertCircle className="size-3.5" aria-hidden="true" />
        Status unavailable
      </div>
    );
  }
  if (!data) return null;
  const s = data;
  const errSummary = errorSummary(s);
  return (
    <div className="space-y-1 border-t border-border/60 pt-2 text-xs">
      <div className="flex items-center justify-between gap-3">
        <StateIndicator state={s.state} />
        <span className="text-fg-subtle tabular-nums">
          {s.globalFiles.toLocaleString()} files · {formatBytes(s.globalBytes)}
        </span>
      </div>
      {s.needTotalItems > 0 && (
        <div className="flex items-center gap-1.5 text-warning">
          <ArrowDown className="size-3.5" aria-hidden="true" />
          {s.needTotalItems.toLocaleString()} pending · {formatBytes(s.needBytes)}
        </div>
      )}
      {errSummary && (
        <div className="flex items-center gap-1.5 text-error">
          <AlertCircle className="size-3.5" aria-hidden="true" />
          {errSummary}
        </div>
      )}
    </div>
  );
}

interface StateMeta {
  label: string;
  tone: 'idle' | 'active' | 'error';
  spinning?: boolean;
}

const STATE_META: Record<string, StateMeta> = {
  idle: { label: 'Idle', tone: 'idle' },
  scanning: { label: 'Scanning', tone: 'active', spinning: true },
  syncing: { label: 'Syncing', tone: 'active', spinning: true },
  'sync-preparing': { label: 'Preparing', tone: 'active', spinning: true },
  'sync-waiting': { label: 'Sync waiting', tone: 'active' },
  cleaning: { label: 'Cleaning', tone: 'active', spinning: true },
  'clean-waiting': { label: 'Clean waiting', tone: 'active' },
  error: { label: 'Error', tone: 'error' },
};

function StateIndicator({ state }: { state: string }) {
  const meta = STATE_META[state] ?? { label: state || 'Unknown', tone: 'idle' as const };
  if (meta.spinning) {
    return (
      <span className="flex items-center gap-1.5 text-fg-muted">
        <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden="true" />
        {meta.label}
      </span>
    );
  }
  const dotColor =
    meta.tone === 'error'
      ? 'bg-error'
      : meta.tone === 'active'
        ? 'bg-primary'
        : 'bg-success';
  return (
    <span className="flex items-center gap-1.5 text-fg-muted">
      <span className={'inline-block size-2 rounded-full ' + dotColor} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function errorSummary(s: STFolderStatus): string | null {
  if (s.error) return s.error;
  if (s.watchError) return `Watch error: ${s.watchError}`;
  const counts: string[] = [];
  if (s.errors > 0) counts.push(`${s.errors} ${s.errors === 1 ? 'error' : 'errors'}`);
  if (s.pullErrors > 0) counts.push(`${s.pullErrors} pull ${s.pullErrors === 1 ? 'error' : 'errors'}`);
  return counts.length ? counts.join(', ') : null;
}
