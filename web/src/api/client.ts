const CSRF_HEADER = 'X-Requested-With';
const CSRF_VALUE = 'syncbrowser';

export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

interface RequestInitWithBody extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export async function api<T>(path: string, init: RequestInitWithBody = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set(CSRF_HEADER, CSRF_VALUE);

  let body: BodyInit | undefined;
  if (init.body !== undefined) {
    if (init.body instanceof FormData || typeof init.body === 'string') {
      body = init.body;
    } else {
      headers.set('Content-Type', 'application/json');
      body = JSON.stringify(init.body);
    }
  }

  const res = await fetch(path, {
    ...init,
    headers,
    body,
    credentials: 'include',
  });

  if (res.status === 401) {
    if (location.pathname !== '/login') {
      location.href = '/login';
    }
    throw new HttpError(401, 'unauthenticated');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new HttpError(res.status, text || res.statusText);
  }

  if (res.status === 204) return undefined as T;

  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

export function syncthingURL(path: string, params?: Record<string, string | number | undefined>): string {
  const base = `/api/syncthing${path.startsWith('/') ? '' : '/'}${path}`;
  if (!params) return base;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${base}?${s}` : base;
}
