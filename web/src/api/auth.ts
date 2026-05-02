import { api } from './client';

export interface AuthStatus {
  authenticated: boolean;
}

export function getStatus(): Promise<AuthStatus> {
  return api<AuthStatus>('/api/auth/status');
}

export function login(apiKey: string): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>('/api/auth/login', {
    method: 'POST',
    body: { apiKey },
  });
}

export function logout(): Promise<void> {
  return api<void>('/api/auth/logout', { method: 'POST' });
}
