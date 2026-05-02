import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Eye,
  Folder,
  Lock,
  Server,
  ServerOff,
  ShieldAlert,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Pill } from '../components/ui/Pill';
import { Spinner } from '../components/ui/Spinner';
import { useFolders } from '../hooks/useFolders';
import type { STDevice, STFolder } from '../lib/types';
import { shortDeviceID } from '../lib/format';

export function Devices() {
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
        Failed to load devices: {error.message}
      </p>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Devices</h2>
      {data.devices.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-fg-faint">
          <ServerOff className="size-8 text-fg-faintest" aria-hidden="true" />
          <p>No devices configured.</p>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {data.devices.map((d) => (
          <DeviceCard key={d.deviceID} device={d} folders={data.folders} />
        ))}
      </div>
    </div>
  );
}

interface SharedFolder {
  folder: STFolder;
  encrypted: boolean;
}

function DeviceCard({ device, folders }: { device: STDevice; folders: STFolder[] }) {
  const shared: SharedFolder[] = folders
    .map((f) => {
      const fd = f.devices.find((x) => x.deviceID === device.deviceID);
      return fd ? { folder: f, encrypted: (fd.encryptionPassword ?? '') !== '' } : null;
    })
    .filter((x): x is SharedFolder => x !== null);

  const addresses = device.addresses ?? [];
  const showAddresses =
    addresses.length > 0 && !(addresses.length === 1 && addresses[0] === 'dynamic');
  const hasLimits = (device.maxSendKbps ?? 0) > 0 || (device.maxRecvKbps ?? 0) > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1.5 text-base font-medium text-fg">
            <Server className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
            <span className="truncate">{device.name || shortDeviceID(device.deviceID)}</span>
          </span>
          {device.paused && <Pill tone="slate" Icon={Eye}>Paused</Pill>}
          {device.untrusted && <Pill tone="rose" Icon={ShieldAlert}>Untrusted</Pill>}
          {device.introducer && <Pill tone="sky" Icon={UserPlus}>Introducer</Pill>}
          {device.autoAcceptFolders && <Pill tone="sky" Icon={UserCheck}>Auto-accept</Pill>}
        </div>
        <p className="ml-5 truncate text-xs text-fg-faint" title={device.deviceID}>
          {shortDeviceID(device.deviceID)}
        </p>
      </CardHeader>
      <CardBody className="space-y-2 text-sm">
        {showAddresses && (
          <Row
            label="Addresses"
            value={<span className="break-all text-fg-muted">{addresses.join(', ')}</span>}
          />
        )}
        <Row label="Compression" value={compressionLabel(device.compression)} />
        {hasLimits && (
          <Row
            label="Limits"
            value={<LimitsLabel send={device.maxSendKbps ?? 0} recv={device.maxRecvKbps ?? 0} />}
          />
        )}
        <Row
          label={
            <span className="flex items-center gap-1">
              <Folder className="size-3.5" aria-hidden="true" />
              Folders
            </span>
          }
          value={<SharedFolders shared={shared} />}
        />
      </CardBody>
    </Card>
  );
}

function Row({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-24 shrink-0 text-xs uppercase tracking-wide text-fg-faint">{label}</span>
      <span className="min-w-0 flex-1 text-fg">{value}</span>
    </div>
  );
}

function compressionLabel(c: string | undefined): string {
  switch (c) {
    case 'metadata': return 'Metadata';
    case 'always': return 'Always';
    case 'never': return 'Never';
    case undefined:
    case '': return '—';
    default: return c;
  }
}

function LimitsLabel({ send, recv }: { send: number; recv: number }) {
  return (
    <span className="inline-flex items-center gap-3 text-fg">
      {send > 0 && (
        <span className="inline-flex items-center gap-1">
          <ArrowUp className="size-3.5 text-fg-subtle" aria-hidden="true" />
          <span className="tabular-nums">{send.toLocaleString()}</span>
          <span className="text-xs text-fg-faint">KB/s</span>
        </span>
      )}
      {recv > 0 && (
        <span className="inline-flex items-center gap-1">
          <ArrowDown className="size-3.5 text-fg-subtle" aria-hidden="true" />
          <span className="tabular-nums">{recv.toLocaleString()}</span>
          <span className="text-xs text-fg-faint">KB/s</span>
        </span>
      )}
    </span>
  );
}

function SharedFolders({ shared }: { shared: SharedFolder[] }) {
  if (shared.length === 0) return <span className="text-fg-faint">—</span>;
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1">
      {shared.map(({ folder, encrypted }) => (
        <li key={folder.id} className="flex items-center gap-1">
          <Link
            to={`/folders/${encodeURIComponent(folder.id)}/browse/`}
            className="text-primary hover:underline"
            title={folder.id}
          >
            {folder.label || folder.id}
          </Link>
          {encrypted && <Pill tone="sky" Icon={Lock}>encrypted</Pill>}
        </li>
      ))}
    </ul>
  );
}
