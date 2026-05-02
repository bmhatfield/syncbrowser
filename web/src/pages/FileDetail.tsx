import { Link, useParams } from 'react-router-dom';

import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { useFile } from '../hooks/useFile';
import { useFolders } from '../hooks/useFolders';
import type { STFileEntry } from '../lib/types';
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
      <nav className="text-sm text-slate-400">
        <Link to="/folders" className="hover:text-slate-200">All folders</Link>
        <span> › </span>
        <Link to={`/folders/${id}/browse/`} className="hover:text-slate-200">{folderID}</Link>
        <span> › </span>
        <span className="text-slate-200" title={filePath}>{filePath || '(root)'}</span>
      </nav>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner className="h-5 w-5" />
        </div>
      ) : error ? (
        <p className="text-rose-400">{error.message}</p>
      ) : data ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Section title="Global">
            <Info data={data.global} deviceNames={deviceNames} />
          </Section>
          <Section title="Local">
            <Info data={data.local} deviceNames={deviceNames} />
          </Section>
          {data.availability && data.availability.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader>
                <h3 className="text-sm font-semibold text-slate-200">Availability</h3>
              </CardHeader>
              <CardBody>
                <ul className="space-y-1 text-sm">
                  {data.availability.map((a, i) => (
                    <li key={`${a.id}-${i}`} className="flex items-center gap-2">
                      <span className="text-slate-200">{deviceNames.get(a.id) ?? shortDeviceID(a.id)}</span>
                      {a.fromTemporary && (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-300">
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
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
  if (!data) return <p className="text-sm text-slate-500">Not present.</p>;
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
      <Detail label="Size" value={formatBytes(data.size)} />
      <Detail label="Modified" value={formatDate(data.modified)} />
      <Detail
        label="Modified by"
        value={deviceNames.get(data.modifiedBy) ?? shortDeviceID(data.modifiedBy)}
      />
      <Detail label="Blocks" value={data.numBlocks ?? '—'} />
      <Detail label="Type" value={fileTypeLabel(data.type)} />
      <Detail
        label="Version"
        value={<code className="text-xs text-slate-300">{formatVersion(data.version)}</code>}
      />
    </dl>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-slate-200">{value}</dd>
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
