import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getStatus, login, logout } from '../api/auth';

export function useAuthStatus() {
  return useQuery({
    queryKey: ['auth', 'status'] as const,
    queryFn: getStatus,
    staleTime: 60_000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (apiKey: string) => login(apiKey),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auth'] }),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auth'] }),
  });
}
