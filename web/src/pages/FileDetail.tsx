import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  EyeOff,
  Globe,
  HardDrive,
  Lock,
  MinusCircle,
  RefreshCw,
  Trash2,
  Wifi,
  type LucideIcon,
} from 'lucide-react';

import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { useFile } from '../hooks/useFile';
import { useFolders } from '../hooks/useFolders';
import type { STFileEntry, STFileInfo } from '../lib/types';
import { formatBytes, formatDate, shortDeviceID } from '../lib/format';

export function FileDetail() {
  const params = useParams();
  const id = params.id ?? '';
  const folderID = decodeURIComponent(id);
  const filePath = decodePath(params['*'] ?? '');

  const { data, isLoading, error } = useFile(folderID, filePath);
  const folders = useFolders();
  const deviceNames = new Map(
    folders.data?.devices.map((d) => [d.deviceID, d.name || shortDeviceID(d.deviceID)]) ?? [],
  );

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-fg-subtle">
        <Link to="/folders" className="hover:text-fg">All folders</Link>
        <ChevronRight className="size-3.5 text-fg-faintest" aria-hidden="true" />
        <Link to={`/folders/${id}/browse/`} className="hover:text-fg">{folderID}</Link>
        <ChevronRight className="size-3.5 text-fg-faintest" aria-hidden="true" />
        <span className="text-fg" title={filePath}>{filePath || '(root)'}</span>
      </nav>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner className="size-5" />
        </div>
      ) : error ? (
        <p className="flex items-center gap-1.5 text-error">
          <AlertCircle className="size-4" aria-hidden="true" />
          {error.message}
        </p>
      ) : data ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Section title="Global" icon={<Globe className="size-4 text-fg-subtle" aria-hidden="true" />}>
            <Info data={data.global} deviceNames={deviceNames} />
          </Section>
          <Section
            title="Local"
            icon={<HardDrive className="size-4 text-fg-subtle" aria-hidden="true" />}
            aside={<SyncStatus data={data} />}
          >
            <Info data={data.local} deviceNames={deviceNames} />
          </Section>
          {data.availability && data.availability.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader>
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-fg">
                  <Wifi className="size-4 text-fg-subtle" aria-hidden="true" />
                  Availability
                </h3>
              </CardHeader>
              <CardBody>
                <ul className="space-y-1 text-sm">
                  {data.availability.map((a, i) => (
                    <li key={`${a.id}-${i}`} className="flex items-center gap-2">
                      <span className="text-fg">{deviceNames.get(a.id) ?? shortDeviceID(a.id)}</span>
                      {a.fromTemporary && (
                        <span className="rounded bg-warn/20 px-1.5 py-0.5 text-xs text-warning">
                          temporary
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Section({
  title,
  icon,
  aside,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-fg">
            {icon}
            {title}
          </h3>
          {aside}
        </div>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

function Info({
  data,
  deviceNames,
}: {
  data: STFileEntry | undefined;
  deviceNames: Map<string, string>;
}) {
  if (!data) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-fg-faint">
        <MinusCircle className="size-4 text-fg-faintest" aria-hidden="true" />
        Not present.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <FlagChips data={data} />
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
        <Detail label="Size" value={formatBytes(data.size)} />
        <Detail label="Modified" value={formatDate(data.modified)} />
        <Detail
          label="Modified by"
          value={deviceNames.get(data.modifiedBy) ?? shortDeviceID(data.modifiedBy)}
        />
        <Detail label="Blocks" value={data.numBlocks ?? '—'} />
        <Detail
          label="Hash"
          value={
            data.blocksHash ? (
              <code className="break-all text-xs text-fg-muted">{data.blocksHash}</code>
            ) : (
              '—'
            )
          }
        />
        <Detail label="Type" value={fileTypeLabel(data.type)} />
        <Detail
          label="Version"
          value={<code className="text-xs text-fg-muted">{formatVersion(data.version)}</code>}
        />
        <Detail label="Sequence" value={data.sequence ?? '—'} />
      </dl>
    </div>
  );
}

function SyncStatus({ data }: { data: STFileInfo }) {
  if (!data.global || !data.local) return null;
  const globalHash = data.global.blocksHash;
  const localHash = data.local.blocksHash;
  if (!globalHash || !localHash) return null;
  if (globalHash === localHash) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-fg-subtle">
        <CheckCircle2 className="size-3.5 text-success" aria-hidden="true" />
        Matches global
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-error">
      <AlertTriangle className="size-3.5" aria-hidden="true" />
      Differs from global
    </span>
  );
}

const FLAGS: { key: keyof STFileEntry; Icon: LucideIcon; label: string; tone: string }[] = [
  { key: 'deleted', Icon: Trash2, label: 'Deleted', tone: 'bg-danger/15 text-error' },
  { key: 'ignored', Icon: EyeOff, label: 'Ignored', tone: 'bg-neutral/20 text-fg-muted' },
  { key: 'invalid', Icon: AlertTriangle, label: 'Invalid', tone: 'bg-danger/15 text-error' },
  { key: 'mustRescan', Icon: RefreshCw, label: 'Must rescan', tone: 'bg-warn/20 text-warning' },
  { key: 'noPermissions', Icon: Lock, label: 'No permissions', tone: 'bg-warn/20 text-warning' },
];

function FlagChips({ data }: { data: STFileEntry }) {
  const active = FLAGS.filter((f) => data[f.key]);
  if (active.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {active.map(({ key, Icon, label, tone }) => (
        <span
          key={String(key)}
          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${tone}`}
        >
          <Icon className="size-3" aria-hidden="true" />
          {label}
        </span>
      ))}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="text-xs uppercase tracking-wide text-fg-faint">{label}</dt>
      <dd className="text-fg">{value}</dd>
    </>
  );
}

function fileTypeLabel(t: number | string | undefined): string {
  // protobuf enum: 0=FILE, 1=DIRECTORY, 2=SYMLINK_FILE (legacy),
  // 3=SYMLINK_DIRECTORY (legacy), 4=SYMLINK. Modern Syncthing serializes
  // these as the string names instead.
  if (t === 0 || t === 'FILE_INFO_TYPE_FILE') return 'File';
  if (t === 1 || t === 'FILE_INFO_TYPE_DIRECTORY') return 'Directory';
  if (t === 4 || t === 'FILE_INFO_TYPE_SYMLINK') return 'Symlink';
  if (t === undefined || t === null) return '—';
  return String(t);
}

interface VersionCounter {
  id?: number | string;
  value?: number | string;
  ID?: number | string;
  Value?: number | string;
}

function formatVersion(version: unknown): string {
  if (version === null || version === undefined) return '—';

  // Modern Syncthing: array of pre-formatted "deviceID:value" strings.
  if (Array.isArray(version) && version.every((v) => typeof v === 'string')) {
    return version.length ? version.join(', ') : '—';
  }

  // Protobuf-derived shape: { counters: [{id, value}, ...] }.
  if (typeof version === 'object' && !Array.isArray(version)) {
    const counters = (version as { counters?: unknown }).counters;
    if (Array.isArray(counters)) return formatCounters(counters);
    return '—';
  }

  // Legacy: array of { id, value } counter objects.
  if (Array.isArray(version)) return formatCounters(version);
  return '—';
}

function formatCounters(counters: unknown[]): string {
  const parts: string[] = [];
  for (const c of counters) {
    if (!c || typeof c !== 'object') continue;
    const x = c as VersionCounter;
    const id = x.id ?? x.ID;
    const value = x.value ?? x.Value;
    if (id === undefined || value === undefined) continue;
    parts.push(`${shortDeviceID(String(id))}:${String(value)}`);
  }
  return parts.length ? parts.join(', ') : '—';
}

function decodePath(rest: string): string {
  return rest.split('/').filter(Boolean).map(decodeURIComponent).join('/');
}
