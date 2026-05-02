import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { syncthingURL } from '../api/client';
import type { STEvent } from '../lib/types';

const STORAGE_KEY = 'eventsEnabled';

export function eventsEnabled(): boolean {
  return typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'true';
}

export function setEventsEnabled(v: boolean): void {
  localStorage.setItem(STORAGE_KEY, v ? 'true' : 'false');
}

interface EventData {
  folder?: string;
  item?: string;
}

export function useEvents(enabled: boolean): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const ctrl = new AbortController();
    let since = 0;

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = setTimeout(resolve, ms);
        ctrl.signal.addEventListener('abort', () => {
          clearTimeout(t);
          resolve();
        });
      });

    void (async () => {
      while (!ctrl.signal.aborted) {
        try {
          const res = await fetch(
            syncthingURL('/events', { since, timeout: 60 }),
            {
              credentials: 'include',
              headers: { 'X-Requested-With': 'syncbrowser' },
              signal: ctrl.signal,
            },
          );
          if (!res.ok) {
            await sleep(2000);
            continue;
          }
          const events = (await res.json()) as STEvent[];
          for (const ev of events) {
            since = ev.id;
            const data = (ev.data ?? {}) as EventData;
            const folder = data.folder;
            const item = data.item;
            switch (ev.type) {
              case 'ItemFinished':
              case 'LocalIndexUpdated':
                if (folder) {
                  void qc.invalidateQueries({ queryKey: ['browse', folder] });
                  void qc.invalidateQueries({ queryKey: ['need', folder] });
                  void qc.invalidateQueries({ queryKey: ['folderStatus', folder] });
                  if (item) void qc.invalidateQueries({ queryKey: ['file', folder, item] });
                }
                break;
              case 'RemoteIndexUpdated':
                if (folder) {
                  void qc.invalidateQueries({ queryKey: ['remoteNeed', folder] });
                  void qc.invalidateQueries({ queryKey: ['browse', folder] });
                  void qc.invalidateQueries({ queryKey: ['folderStatus', folder] });
                }
                break;
              case 'FolderSummary':
                void qc.invalidateQueries({ queryKey: ['folders'] });
                if (folder) {
                  void qc.invalidateQueries({ queryKey: ['folderStatus', folder] });
                }
                break;
              default:
                break;
            }
          }
          // Refresh device-level status (uptime, listeners, discovery) on any
          // activity. Empty long-poll timeouts are skipped so we don't
          // refetch on a 60s cadence with no events.
          if (events.length > 0) {
            void qc.invalidateQueries({ queryKey: ['systemStatus'] });
          }
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') return;
          await sleep(2000);
        }
      }
    })();

    return () => { ctrl.abort(); };
  }, [enabled, qc]);
}
