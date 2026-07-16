'use client';

import { Alert, Heading, Text, cn } from '@tms/ui';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from './auth-provider';
import { type AuthErrors, validateLogin, validateRegister } from '@/lib/auth';

const inputClass =
  'h-11 w-full rounded-md border bg-canvas px-3 text-sm text-ink outline-none placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]';

function Field({
  id,
  label,
  type = 'text',
  autoComplete,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn('mt-1.5', inputClass, error ? 'border-error' : 'border-line-2')}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register } = useAuth();
  const isRegister = mode === 'register';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<AuthErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const next = searchParams.get('next') || '/account';

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const found = isRegister
      ? validateRegister({ name, email, password, confirm })
      : validateLogin({ email, password });
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const result = isRegister ? register({ name, email }) : login({ email });
    if (!result.ok) {
      setFormError(result.error ?? 'Something went wrong. Please try again.');
      return;
    }
    router.push(next);
  }

  return (
    <div className="mx-auto max-w-sm">
      <Heading as={1} size="display-lg">
        {isRegister ? 'Create account' : 'Sign in'}
      </Heading>
      <Text tone="secondary" className="mt-2">
        {isRegister
          ? 'Save your designs, track orders and check out faster.'
          : 'Welcome back to the studio.'}
      </Text>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        {formError ? (
          <Alert tone="error" title={isRegister ? 'Could not create account' : 'Could not sign in'}>
            {formError}
          </Alert>
        ) : null}

        {isRegister ? (
          <Field
            id="name"
            label="Name"
            autoComplete="name"
            value={name}
            onChange={setName}
            error={errors.name}
          />
        ) : null}
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          error={errors.email}
        />
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          value={password}
          onChange={setPassword}
          error={errors.password}
        />
        {isRegister ? (
          <Field
            id="confirm"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={setConfirm}
            error={errors.confirm}
          />
        ) : null}

        <button
          type="submit"
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-accent text-sm font-medium text-on-accent outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          {isRegister ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <Text size="sm" tone="muted" className="mt-4 text-center">
        {isRegister ? (
          <>
            Already have an account?{' '}
            <Link href="/login" className="text-ink underline-offset-2 hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New to the studio?{' '}
            <Link href="/register" className="text-ink underline-offset-2 hover:underline">
              Create an account
            </Link>
          </>
        )}
      </Text>

      <Alert tone="info" title="Preview sign-in" className="mt-6">
        This is a demo account stored only in your browser, no password is saved and no data leaves
        this device. Real accounts arrive with the auth backend.
      </Alert>
    </div>
  );
}
