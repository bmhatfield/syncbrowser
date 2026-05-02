import { useQuery } from '@tanstack/react-query';
import { browse, type STBrowseRaw } from '../api/syncthing';

export interface BrowseEntry {
  name: string;
  type: 'dir' | 'file';
  size?: number;
  modified?: string;
}

function parseBrowse(raw: STBrowseRaw): BrowseEntry[] {
  const out: BrowseEntry[] = [];
  for (const [name, val] of Object.entries(raw)) {
    if (Array.isArray(val)) {
      // [size, modifiedNanos]
      const [size, modifiedNanos] = val as [number, number];
      out.push({
        name,
        type: 'file',
        size,
        modified: modifiedNanos
          ? new Date(modifiedNanos / 1_000_000).toISOString()
          : undefined,
      });
    } else if (val && typeof val === 'object') {
      out.push({ name, type: 'dir' });
    }
  }
  out.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return out;
}

export function useBrowse(folder: string, prefix: string, levels = 1) {
  return useQuery({
    queryKey: ['browse', folder, prefix, levels] as const,
    queryFn: async () => parseBrowse(await browse(folder, prefix, levels)),
    enabled: Boolean(folder),
  });
}
