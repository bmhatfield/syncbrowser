import { useQuery } from '@tanstack/react-query';
import { browse, type STBrowseRaw } from '../api/syncthing';

export interface BrowseEntry {
  name: string;
  type: 'dir' | 'file';
  size?: number;
  modified?: string;
}

interface BrowseItem {
  name?: string;
  type?: string | number;
  size?: number;
  modified?: string;
}

// Syncthing's type field is a protobuf enum that may be serialized as the
// numeric value or the string name depending on version.
function isDirectoryType(t: string | number | undefined): boolean {
  return (
    t === 1 ||
    t === 'FILE_INFO_TYPE_DIRECTORY' ||
    t === 'DIRECTORY' ||
    t === 'directory'
  );
}

function parseBrowse(raw: STBrowseRaw): BrowseEntry[] {
  const out: BrowseEntry[] = [];

  if (Array.isArray(raw)) {
    // Modern Syncthing: array of FileInfo objects.
    for (const item of raw as BrowseItem[]) {
      if (!item || typeof item.name !== 'string' || item.name === '') continue;
      const isDir = isDirectoryType(item.type);
      out.push({
        name: item.name,
        type: isDir ? 'dir' : 'file',
        size: isDir ? undefined : item.size,
        modified: item.modified,
      });
    }
  } else if (raw && typeof raw === 'object') {
    // Legacy Syncthing: { name: nestedObject (dir) | [size, mtimeNanos] (file) }.
    for (const [name, val] of Object.entries(raw as Record<string, unknown>)) {
      if (Array.isArray(val)) {
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
