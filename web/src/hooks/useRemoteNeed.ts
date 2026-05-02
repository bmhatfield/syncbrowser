import { useQuery } from '@tanstack/react-query';
import { remoteNeed } from '../api/syncthing';

export function useRemoteNeed(folder: string, device: string) {
  return useQuery({
    queryKey: ['remoteNeed', folder, device] as const,
    queryFn: () => remoteNeed(folder, device),
    enabled: Boolean(folder) && Boolean(device),
  });
}
