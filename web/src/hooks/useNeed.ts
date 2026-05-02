import { useQuery } from '@tanstack/react-query';
import { localNeed } from '../api/syncthing';

export function useNeed(folder: string) {
  return useQuery({
    queryKey: ['need', folder] as const,
    queryFn: () => localNeed(folder),
    enabled: Boolean(folder),
  });
}
