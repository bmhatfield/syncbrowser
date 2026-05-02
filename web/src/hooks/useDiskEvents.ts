import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { syncthingURL } from '../api/client';
import { diskEvents as fetchDiskEvents } from '../api/syncthing';
import type { STDiskEvent } from '../lib/types';

export function useDiskEvents(limit: number, live: boolean) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['diskEvents', limit] as const,
    queryFn: () => fetchDiskEvents({ limit }),
    staleTime: Infinity,
  });

  const isFetched = query.isSuccess;

  useEffect(() => {
    if (!live || !isFetched) return;
    const queryKey = ['diskEvents', limit] as const;
    const ctrl = new AbortController();

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = setTimeout(resolve, ms);
        ctrl.signal.addEventListener('abort', () => {
          clearTimeout(t);
          resolve();
        });
      });

    void (async () => {
      let since = 0;
      const current = qc.getQueryData<STDiskEvent[]>(queryKey);
      if (current && current.length > 0) since = current[current.length - 1].id;

      while (!ctrl.signal.aborted) {
        try {
          const res = await fetch(
            syncthingURL('/events/disk', { since, timeout: 60 }),
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
          const batch = (await res.json()) as STDiskEvent[];
          if (batch.length > 0) {
            since = batch[batch.length - 1].id;
            qc.setQueryData<STDiskEvent[]>(queryKey, (old) => {
              const merged = [...(old ?? []), ...batch];
              const byId = new Map<number, STDiskEvent>();
              for (const e of merged) byId.set(e.id, e);
              return Array.from(byId.values())
                .sort((a, b) => a.id - b.id)
                .slice(-limit);
            });
          }
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') return;
          await sleep(2000);
        }
      }
    })();

    return () => { ctrl.abort(); };
  }, [live, isFetched, limit, qc]);

  return query;
}
