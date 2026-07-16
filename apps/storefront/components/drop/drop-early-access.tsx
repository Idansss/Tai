'use client';

import { Alert, buttonVariants } from '@tms/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/account/auth-provider';
import { WaitlistForm } from '@/components/waitlist/waitlist-form';
import type { DropStatus } from '@/lib/drops';
import { waitlistKey } from '@/lib/waitlist';

/**
 * Early-access / membership + waitlist panel for a drop (TMS-F5-001 / F5-002).
 * UI only, it surfaces the membership story and routes guests to sign in, but
 * does NOT enforce access (there is no real membership tier yet). The waitlist
 * capture is a client-side preview (TMS-F5-002 / TMS-FBR-008), no real
 * notification is sent. Every promise is framed as a preview.
 */
export function DropEarlyAccess({
  status,
  slug,
  title,
}: {
  status: DropStatus;
  slug: string;
  title: string;
}) {
  const { user, ready } = useAuth();
  const pathname = usePathname();
  const signInHref = `/login?next=${encodeURIComponent(pathname)}`;
  const key = waitlistKey('drop', slug);

  // Avoid a flash of the wrong state before the session hydrates.
  if (!ready) return null;

  if (status === 'live') {
    return (
      <Alert tone="success" title="This drop is live">
        Every piece below is available to order now, made to order and shipped when the drop
        closes.
      </Alert>
    );
  }

  if (status === 'ended' || status === 'sold_out') {
    return (
      <div className="space-y-4">
        <Alert tone="warning" title={status === 'sold_out' ? 'Sold out' : 'This drop has closed'}>
          {status === 'sold_out'
            ? 'Every piece in this drop has sold through.'
            : 'The ordering window for this drop has ended.'}
        </Alert>
        <WaitlistForm
          listKey={key}
          title={status === 'sold_out' ? 'Notify me if it restocks' : 'Tell me about the next drop'}
          description={`Get an email about ${title} or the next release.`}
        />
      </div>
    );
  }

  // upcoming or early_access
  const earlyOpen = status === 'early_access';
  const panel = user ? (
    <Alert tone="success" title={earlyOpen ? 'Early access is open' : "You're on the list"}>
      <p>
        Signed in as <span className="font-medium text-ink">{user.name}</span>.{' '}
        {earlyOpen
          ? 'Your early access is open, browse the pieces below before the public release.'
          : "We'll open early access to members first when this drop goes live."}
      </p>
      <p className="mt-2 text-xs text-muted">
        Preview, early-access gating and notifications are not enforced yet (TMS-FBR-008).
      </p>
    </Alert>
  ) : (
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
    </Alert>
  );

  return (
    <div className="space-y-4">
      {panel}
      {!earlyOpen ? (
        <WaitlistForm
          listKey={key}
          title="Remind me when it opens"
          description={`Get an email when ${title} goes live.`}
        />
      ) : null}
    </div>
  );
}
