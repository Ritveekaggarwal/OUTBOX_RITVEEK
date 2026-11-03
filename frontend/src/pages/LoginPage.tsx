import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/endpoints';
import { ApiError } from '../api/http';
import { GoogleIcon } from '../components/icons';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { useAuth } from '../context/AuthContext';

type Mode = 'login' | 'signup';

export function LoginPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<Mode>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(params.get('error'));
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result =
        mode === 'login'
          ? await authApi.login({ email: form.email, password: form.password })
          : await authApi.register(form);
      setUser(result.user);
      navigate('/scheduled', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reach the server');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-[460px] animate-slide-up border-y border-surface-line px-10 py-12 sm:rounded-2xl sm:border sm:shadow-card">
        <h1 className="text-center text-[28px] font-bold text-ink-900">{mode === 'login' ? 'Login' : 'Create account'}</h1>

        <a
          href={authApi.googleUrl}
          className="mt-8 flex h-11 w-full items-center justify-center gap-2.5 rounded-lg bg-brand-50 text-sm font-medium text-ink-900 transition hover:bg-brand-100 active:scale-[0.99]"
        >
          <GoogleIcon size={18} />
          Login with Google
        </a>

        <div className="my-6 flex items-center gap-3 text-xs text-ink-400">
          <span className="h-px flex-1 bg-surface-line" />
          or sign up through email
          <span className="h-px flex-1 bg-surface-line" />
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
          {mode === 'signup' && (
            <TextField placeholder="Full name" autoComplete="name" value={form.name} onChange={update('name')} required />
          )}
          <TextField
            type="email"
            placeholder="Email ID"
            autoComplete="email"
            value={form.email}
            onChange={update('email')}
            required
          />
          <TextField
            type="password"
            placeholder="Password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={form.password}
            onChange={update('password')}
            required
          />

          {error && (
            <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger-text">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" fullWidth loading={submitting} className="mt-3 h-12">
            {mode === 'login' ? 'Login' : 'Sign up'}
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-ink-500">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError(null);
            }}
            className="font-medium text-brand-600 hover:underline"
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
}
