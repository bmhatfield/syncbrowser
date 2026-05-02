import { useState, type ReactNode } from 'react';
import { Clock, HardDrive, Network, QrCode, Radar, Tag } from 'lucide-react';

import { useLocalStateTotal, useSystemStatus, useSystemVersion } from '../hooks/useSystem';
import type { STServiceStatus } from '../lib/types';
import { formatBytes, formatUptime, shortDeviceID } from '../lib/format';

export function DeviceStatus() {
  const status = useSystemStatus();
  const version = useSystemVersion();
  const local = useLocalStateTotal();

  const listeners = countServices(status.data?.connectionServiceStatus);
  const discovery = countServices(status.data?.discoveryStatus);

  if (!status.data && !version.data && !local.ready) return null;

  return (
    <div className="border-t border-border/60 bg-canvas/40">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 text-xs text-fg-muted">
        {status.data?.myID && (
          <Item icon={<QrCode className="size-3.5" aria-hidden="true" />} label="ID">
            <DeviceIDButton id={status.data.myID} />
          </Item>
        )}
        {status.data?.uptime !== undefined && (
          <Item icon={<Clock className="size-3.5" aria-hidden="true" />} label="Uptime">
            {formatUptime(status.data.uptime)}
          </Item>
        )}
        {listeners && (
          <Item
            icon={<Network className="size-3.5" aria-hidden="true" />}
            label="Listeners"
            tone={listeners.ok === listeners.total ? 'ok' : 'warn'}
          >
            {listeners.ok}/{listeners.total}
          </Item>
        )}
        {discovery && (
          <Item
            icon={<Radar className="size-3.5" aria-hidden="true" />}
            label="Discovery"
            tone={discovery.ok === discovery.total ? 'ok' : 'warn'}
          >
            {discovery.ok}/{discovery.total}
          </Item>
        )}
        {local.ready && (
          <Item icon={<HardDrive className="size-3.5" aria-hidden="true" />} label="Local">
            {local.files.toLocaleString()} files · {local.directories.toLocaleString()} folders ·{' '}
            {formatBytes(local.bytes)}
          </Item>
        )}
        {version.data && (
          <Item icon={<Tag className="size-3.5" aria-hidden="true" />} label="Version">
            {version.data.version} · {osLabel(version.data.os)} {version.data.arch}
          </Item>
        )}
      </div>
    </div>
  );
}

function DeviceIDButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = () => {
    void (async () => {
      try {
        await navigator.clipboard.writeText(id);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        // clipboard unavailable (e.g. non-HTTPS, denied) — silently no-op
      }
    })();
  };
  return (
    <button
      type="button"
      onClick={onClick}
      title={copied ? 'Copied!' : `${id} (click to copy)`}
      className="cursor-pointer font-mono text-fg-subtle underline decoration-dotted decoration-fg-faintest underline-offset-2 hover:text-fg"
    >
      {copied ? 'Copied!' : shortDeviceID(id)}
    </button>
  );
}

function Item({
  icon,
  label,
  tone,
  children,
}: {
  icon: ReactNode;
  label: string;
  tone?: 'ok' | 'warn';
  children: ReactNode;
}) {
  const valueClass =
    tone === 'warn' ? 'text-warning' : tone === 'ok' ? 'text-success' : 'text-fg';
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-fg-faint" aria-hidden="true">{icon}</span>
      <span className="text-fg-faint">{label}</span>
      <span className={'tabular-nums ' + valueClass}>{children}</span>
    </span>
  );
}

function countServices(
  m: Record<string, STServiceStatus> | undefined,
): { ok: number; total: number } | null {
  if (!m) return null;
  const entries = Object.values(m);
  if (entries.length === 0) return null;
  const ok = entries.filter((e) => !e.error).length;
  return { ok, total: entries.length };
}

function osLabel(os: string): string {
  switch (os) {
    case 'darwin':
      return 'macOS';
    case 'linux':
      return 'Linux';
    case 'windows':
      return 'Windows';
    case 'freebsd':
      return 'FreeBSD';
    case 'openbsd':
      return 'OpenBSD';
    case 'netbsd':
      return 'NetBSD';
    default:
      return os;
  }
}
