import { useQuery } from '@tanstack/react-query';
import { fileInfo } from '../api/syncthing';

export function useFile(folder: string, file: string) {
  return useQuery({
    queryKey: ['file', folder, file] as const,
    queryFn: () => fileInfo(folder, file),
    enabled: Boolean(folder) && Boolean(file),
  });
}
