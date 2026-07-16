'use client';

import { Alert, Heading, Text, cn } from '@tms/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { type AuthErrors, validateLogin } from '@/lib/admin-auth';
import { useAdminAuth } from './admin-auth-provider';

const inputClass =
  'h-11 w-full rounded-md border bg-canvas px-3 text-sm text-ink outline-none placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]';

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
      <div className="mb-6 text-center">
        <span className="font-display text-sm font-semibold tracking-tight text-ink">
          TMS Admin
        </span>
        <Heading as={1} size="display-lg" className="mt-3">
          Sign in
        </Heading>
        <Text tone="secondary" className="mt-1">
          Operational console for Tai Manic Studios.
        </Text>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ink">
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
          <label htmlFor="password" className="block text-sm font-medium text-ink">
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
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-accent text-sm font-medium text-on-accent outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          Sign in
        </button>
      </form>

      <Alert tone="info" title="Preview console" className="mt-6">
        This is a preview build — no staff accounts, roles or passwords exist yet. Any well-formed
        sign-in starts a demo session stored only in your browser. Real staff auth and role-based
        access arrive with the admin auth backend.
      </Alert>
    </div>
  );
}
