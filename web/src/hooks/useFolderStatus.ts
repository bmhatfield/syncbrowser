import { useQuery } from '@tanstack/react-query';
import { folderStatus } from '../api/syncthing';

export function useFolderStatus(folder: string) {
  return useQuery({
    queryKey: ['folderStatus', folder] as const,
    queryFn: () => folderStatus(folder),
    enabled: Boolean(folder),
  });
}
