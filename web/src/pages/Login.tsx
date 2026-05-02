import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuthStatus, useLogin } from '../hooks/useAuth';

export function Login() {
  const status = useAuthStatus();
  const navigate = useNavigate();
  const login = useLogin();
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status.data?.authenticated) {
      navigate('/folders', { replace: true });
    }
  }, [status.data, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login.mutateAsync(apiKey.trim());
      navigate('/folders', { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg || 'Login failed');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-lg font-semibold text-sky-400">syncbrowser</h1>
          <p className="mt-1 text-sm text-slate-400">
            Paste your Syncthing API key to begin.
          </p>
        </CardHeader>
        <CardBody>
          <form
            className="space-y-3"
            onSubmit={(e) => { void handleSubmit(e); }}
          >
            <label className="block text-sm">
              <span className="mb-1 block text-slate-300">API key</span>
              <Input
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="From Syncthing → Settings → GUI"
                required
              />
            </label>
            {error && (
              <p className="text-sm text-rose-400">{error}</p>
            )}
            <Button type="submit" disabled={login.isPending || !apiKey.trim()}>
              {login.isPending ? 'Verifying…' : 'Sign in'}
            </Button>
            <p className="text-xs text-slate-500">
              The key is stored in an HttpOnly cookie scoped to <code>/api</code> and
              never sent to other origins.
            </p>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
