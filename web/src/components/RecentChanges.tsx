import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileMinus,
  FilePen,
  FilePlus,
  History,
} from 'lucide-react';

import { useDiskEvents } from '../hooks/useDiskEvents';
import { useFolders } from '../hooks/useFolders';
import type { STDiskEvent } from '../lib/types';
import { formatRelative, shortDeviceID } from '../lib/format';

const STORAGE_KEY = 'recentChangesCollapsed';
const LIMIT = 10;

function readCollapsed(): boolean {
  return typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'true';
}

function writeCollapsed(v: boolean): void {
  localStorage.setItem(STORAGE_KEY, v ? 'true' : 'false');
}

export function RecentChanges({ live }: { live: boolean }) {
  const [collapsed, setCollapsed] = useState(() => readCollapsed());
  const folders = useFolders();
  const events = useDiskEvents(LIMIT, live);

  if (!events.data || events.data.length === 0) return null;

  const labelFor = (folderID: string) =>
    folders.data?.folders.find((f) => f.id === folderID)?.label ?? folderID;

  const items = [...events.data].reverse();

  const toggle = () => {
    setCollapsed((c) => {
      writeCollapsed(!c);
      return !c;
    });
  };

  return (
    <div className="border-t border-border/60 bg-canvas/30">
      <div className="mx-auto max-w-6xl px-4">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          className="flex w-full items-center gap-1.5 py-1.5 text-xs text-fg-muted hover:text-fg"
        >
          {collapsed ? (
            <ChevronRight className="size-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-3.5" aria-hidden="true" />
          )}
          <History className="size-3.5 text-fg-faint" aria-hidden="true" />
          <span>Recent changes</span>
          <span className="text-fg-faint">({items.length})</span>
        </button>
        {!collapsed && (
          <ul className="space-y-0.5 pb-2 text-xs">
            {items.map((e) => (
              <Row key={e.id} ev={e} folderLabel={labelFor(e.data.folder)} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Row({ ev, folderLabel }: { ev: STDiskEvent; folderLabel: string }) {
  const action = ev.data.action;
  const Icon = action === 'added' ? FilePlus : action === 'deleted' ? FileMinus : FilePen;
  const tone =
    action === 'added' ? 'text-success'
      : action === 'deleted' ? 'text-error'
        : 'text-warning';
  const local = ev.type === 'LocalChangeDetected';
  const by = local
    ? 'locally'
    : ev.data.modifiedBy
      ? shortDeviceID(ev.data.modifiedBy)
      : 'remote';

  return (
    <li className="flex items-center gap-2">
      <Icon className={`size-3.5 shrink-0 ${tone}`} aria-hidden="true" />
      <div className="min-w-0 flex-1 truncate">
        <span className="text-fg-faint" title={ev.data.folder}>{folderLabel}</span>
        <span className="text-fg-faint">/</span>
        <code className="text-fg-subtle">{ev.data.path}</code>
      </div>
      <span className="shrink-0 text-fg-faint tabular-nums">{formatRelative(ev.time)}</span>
      <span className="shrink-0 text-fg-faint">·</span>
      <span className="shrink-0 text-fg-muted">{by}</span>
    </li>
  );
}
