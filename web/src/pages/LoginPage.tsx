import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Button, Input, Label } from '../components/ui';
import { ApiError } from '../lib/api';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(username.trim(), password);
      navigate('/admin');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ورود ناموفق بود.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 py-14">
      <div className="card p-6">
        <h1 className="text-lg font-extrabold text-ink-900">ورود به پنل مدیریت</h1>
        <p className="mt-1.5 text-xs leading-6 text-ink-500">
          برای مدیریت دوره‌ها، آزمون‌ها و نتایج وارد شوید.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <Label>نام کاربری</Label>
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              dir="ltr"
              className="text-right"
            />
          </div>
          <div>
            <Label>رمز عبور</Label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              dir="ltr"
              className="text-right"
            />
          </div>

          {error ? (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</p>
          ) : null}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'در حال ورود…' : 'ورود'}
          </Button>
        </form>
      </div>
    </div>
  );
}
