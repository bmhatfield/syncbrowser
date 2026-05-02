import { useQueries, useQuery } from '@tanstack/react-query';
import { folderStatus, systemStatus, systemVersion } from '../api/syncthing';
import { useFolders } from './useFolders';

export function useSystemStatus() {
  return useQuery({
    queryKey: ['systemStatus'] as const,
    queryFn: systemStatus,
  });
}

export function useSystemVersion() {
  return useQuery({
    queryKey: ['systemVersion'] as const,
    queryFn: systemVersion,
    staleTime: 60 * 60 * 1000,
  });
}

export interface LocalStateTotal {
  files: number;
  directories: number;
  bytes: number;
  ready: boolean;
}

export function useLocalStateTotal(): LocalStateTotal {
  const { data: cfg } = useFolders();
  const ids = cfg?.folders.map((f) => f.id) ?? [];

  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['folderStatus', id] as const,
      queryFn: () => folderStatus(id),
    })),
  });

  let files = 0;
  let directories = 0;
  let bytes = 0;
  let loaded = 0;
  for (const q of queries) {
    if (q.data) {
      files += q.data.localFiles;
      directories += q.data.localDirectories;
      bytes += q.data.localBytes;
      loaded += 1;
    }
  }
  return { files, directories, bytes, ready: ids.length > 0 && loaded === ids.length };
}
