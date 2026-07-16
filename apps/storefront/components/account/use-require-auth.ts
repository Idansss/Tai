'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from './auth-provider';

/**
 * Guard an account surface: once the session has hydrated, redirect guests to
 * sign in with a `?next=` back to the current page. Returns the auth state so
 * the caller can render a loading skeleton until `ready` and `user` are set.
 *
 * Pass `enabled: false` to temporarily suspend the guard, used during an
 * explicit sign-out so the "no user" state navigates home instead of bouncing
 * to the login page.
 */
export function useRequireAuth(next: string, enabled = true) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (enabled && ready && !user) {
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [enabled, ready, user, router, next]);

  return { user, ready };
}
