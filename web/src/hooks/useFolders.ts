import { useQuery } from '@tanstack/react-query';
import { getConfig } from '../api/syncthing';

export function useFolders() {
  return useQuery({
    queryKey: ['folders'] as const,
    queryFn: getConfig,
  });
}
