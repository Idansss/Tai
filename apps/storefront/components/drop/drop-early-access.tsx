'use client';

import { Alert, buttonVariants } from '@tms/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/account/auth-provider';
import type { DropStatus } from '@/lib/drops';

/**
 * Early-access / membership panel for a drop (TMS-F5-001). This is UI only — it
 * surfaces the membership story and routes guests to sign in, but does NOT
 * enforce access (there is no real membership tier yet) and does NOT capture a
 * waitlist (that is TMS-F5-002 / TMS-FBR-008). Every promise is framed as a
 * preview so nothing is overstated.
 */
export function DropEarlyAccess({ status }: { status: DropStatus }) {
  const { user, ready } = useAuth();
  const pathname = usePathname();
  const signInHref = `/login?next=${encodeURIComponent(pathname)}`;

  // Avoid a flash of the wrong state before the session hydrates.
  if (!ready) return null;

  if (status === 'live') {
    return (
      <Alert tone="success" title="This drop is live">
        Every piece below is available to order now — made to order and shipped when the drop
        closes.
      </Alert>
    );
  }

  if (status === 'ended' || status === 'sold_out') {
    return (
      <Alert tone="warning" title={status === 'sold_out' ? 'Sold out' : 'This drop has closed'}>
        <p>
          {status === 'sold_out'
            ? 'Every piece in this drop has sold through.'
            : 'The ordering window for this drop has ended.'}{' '}
          Waitlist sign-up for the next release is coming soon.
        </p>
        <p className="mt-2 text-xs text-muted">
          Preview — the back-in-stock waitlist is not wired up yet (TMS-F5-002).
        </p>
      </Alert>
    );
  }

  // upcoming or early_access
  const earlyOpen = status === 'early_access';
  if (user) {
    return (
      <Alert tone="success" title={earlyOpen ? 'Early access is open' : "You're on the list"}>
        <p>
          Signed in as <span className="font-medium text-ink">{user.name}</span>.{' '}
          {earlyOpen
            ? 'Your early access is open — browse the pieces below before the public release.'
            : "We'll open early access to members first when this drop goes live."}
        </p>
        <p className="mt-2 text-xs text-muted">
          Preview — early-access gating and notifications are not enforced yet (TMS-FBR-008).
        </p>
      </Alert>
    );
  }

  return (
    <Alert
      tone="info"
      title={earlyOpen ? 'Early access is open for members' : 'Members get early access'}
    >
      <p>
        {earlyOpen
          ? 'Sign in for first access to this drop before the public release.'
          : 'Sign in and we’ll give you first access when this drop opens.'}
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <Link href={signInHref} className={buttonVariants({ size: 'sm' })}>
          Sign in
        </Link>
        <Link href="/register" className={buttonVariants({ size: 'sm', variant: 'secondary' })}>
          Create account
        </Link>
      </div>
      <p className="mt-3 text-xs text-muted">
        Preview — membership tiers aren’t enforced yet (TMS-FBR-008).
      </p>
    </Alert>
  );
}
