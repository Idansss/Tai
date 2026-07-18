'use client';

import { cn } from '@tms/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { type AuthErrors, validateLogin } from '@/lib/admin-auth';
import { useAdminAuth } from './admin-auth-provider';

const inputClass =
  'h-11 w-full rounded-md border bg-surface px-3 text-sm text-ink outline-none placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]';

export function AdminLoginForm() {
  const { user, ready, login } = useAdminAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<AuthErrors>({});

  // Already signed in? Go straight to the console.
  useEffect(() => {
    if (ready && user) router.replace('/');
  }, [ready, user, router]);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found = validateLogin({ email, password });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    login({ email });
    router.replace('/');
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <span className="font-display text-lg font-semibold tracking-tight text-ink">F.A.T.U</span>
        <p className="mt-1 font-display text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">
          Admin
        </p>
        <h1 className="mt-6 font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight text-ink sm:text-5xl">
          Sign in
        </h1>
        <p className="mt-4 text-sm text-muted sm:text-base">
          Operational console for From Africa To You.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-4 text-left">
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-medium uppercase tracking-[0.08em] text-ink"
          >
            Work email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className={cn(inputClass, 'mt-1.5', errors.email ? 'border-error' : 'border-line-2')}
          />
          {errors.email ? (
            <p id="email-error" role="alert" className="mt-1 text-xs text-error">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-medium uppercase tracking-[0.08em] text-ink"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'password-error' : undefined}
            className={cn(inputClass, 'mt-1.5', errors.password ? 'border-error' : 'border-line-2')}
          />
          {errors.password ? (
            <p id="password-error" role="alert" className="mt-1 text-xs text-error">
              {errors.password}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-accent text-xs font-semibold uppercase tracking-[0.08em] text-on-accent outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
