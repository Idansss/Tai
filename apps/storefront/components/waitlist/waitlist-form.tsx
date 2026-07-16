'use client';

import { Alert, Button } from '@tms/ui';
import { useEffect, useId, useState } from 'react';
import { useAuth } from '@/components/account/auth-provider';
import { joinWaitlist } from '@/lib/waitlist';

interface WaitlistFormProps {
  /** Storage key for this list, from `waitlistKey(kind, id)`. */
  listKey: string;
  /** Heading, e.g. "Notify me when it's back". */
  title: string;
  /** One-line context on what the notification is for. */
  description?: string;
  submitLabel?: string;
}

type Status = 'idle' | 'joined' | 'already';

/**
 * Reusable waitlist / back-in-stock capture (TMS-F5-002). Preview only, the
 * email is stored client-side (`lib/waitlist.ts`) and **no real notification is
 * sent** (TMS-FBR-008). Prefills from the signed-in session when available.
 */
export function WaitlistForm({
  listKey,
  title,
  description,
  submitLabel = 'Notify me',
}: WaitlistFormProps) {
  const { user, ready } = useAuth();
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();

  // Prefill once from the session, unless the customer has already typed.
  useEffect(() => {
    if (ready && user && !touched && email === '') setEmail(user.email);
  }, [ready, user, touched, email]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = joinWaitlist(listKey, email);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setStatus(result.alreadyJoined ? 'already' : 'joined');
  }

  if (status === 'joined' || status === 'already') {
    return (
      <Alert
        tone="success"
        title={status === 'already' ? "You're already on the list" : "You're on the list"}
      >
        <p>
          {status === 'already'
            ? `We already have ${email} down for this.`
            : `We’ll email ${email}, as a preview, so no message is actually sent yet.`}
        </p>
      </Alert>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-[var(--radius-md)] border border-line p-4"
    >
      <p className="text-sm font-medium text-ink">{title}</p>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label htmlFor={inputId} className="sr-only">
          Email address
        </label>
        <input
          id={inputId}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setTouched(true);
            if (error) setError(null);
          }}
          placeholder="you@example.com"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        />
        <Button type="submit" size="sm">
          {submitLabel}
        </Button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-sm text-error">
          {error}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-muted">
        Preview, sign-ups are stored on this device and no notification is sent yet (TMS-FBR-008).
      </p>
    </form>
  );
}
