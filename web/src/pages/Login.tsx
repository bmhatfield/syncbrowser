import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, KeyRound, Loader2, LogIn } from 'lucide-react';

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
          <div className="flex items-center gap-2">
            <KeyRound className="size-5 text-sky-400" aria-hidden="true" />
            <h1 className="text-lg font-semibold text-sky-400">syncbrowser</h1>
          </div>
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
              <p className="flex items-center gap-1.5 text-sm text-rose-400">
                <AlertCircle className="size-4" aria-hidden="true" />
                {error}
              </p>
            )}
            <Button type="submit" disabled={login.isPending || !apiKey.trim()}>
              {login.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Verifying…
                </>
              ) : (
                <>
                  <LogIn className="size-4" aria-hidden="true" />
                  Sign in
                </>
              )}
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
