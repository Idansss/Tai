'use client';

import { Heading, Price, Skeleton, Text } from '@tms/ui';
import { Package } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { type PlacedOrder, readLastOrder } from '@/lib/order';
import { useAuth } from './auth-provider';

export function AccountOverview() {
  const { user, ready, logout } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const loggingOut = useRef(false);

  // Redirect guests to sign in once the session has hydrated. An explicit
  // sign-out navigates home instead, so skip the redirect in that case.
  useEffect(() => {
    if (ready && !user && !loggingOut.current) router.replace('/login?next=/account');
  }, [ready, user, router]);

  useEffect(() => {
    if (user) setOrder(readLastOrder());
  }, [user]);

  if (!ready || !user) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-40 w-full max-w-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Heading as={1} size="display-lg">
            Your account
          </Heading>
          <Text tone="secondary" className="mt-1">
            Signed in as <span className="font-medium text-ink">{user.name}</span> · {user.email}
          </Text>
        </div>
        <button
          type="button"
          onClick={() => {
            loggingOut.current = true;
            logout();
            router.push('/');
          }}
          className="inline-flex h-11 items-center justify-center rounded-md border border-line-2 px-5 text-sm font-medium text-ink outline-none hover:bg-canvas-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          Sign out
        </button>
      </div>

      <section aria-labelledby="orders-heading">
        <Heading as={2} id="orders-heading" size="md" className="mb-3">
          Recent order
        </Heading>
        {order ? (
          <Link
            href="/checkout/success"
            className="flex items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-line bg-canvas-2 p-5 outline-none hover:border-line-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          >
            <span>
              <span className="block text-sm font-medium text-ink">{order.reference}</span>
              <span className="block text-xs text-muted">
                {new Date(order.placedAt).toLocaleDateString()} ·{' '}
                {order.items.reduce((n, i) => n + i.quantity, 0)} item(s) · {order.status}
              </span>
            </span>
            <Price
              amountMinor={order.totals.totalMinor}
              currency={order.currency}
              className="shrink-0 text-ink"
            />
          </Link>
        ) : (
          <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-line p-5 text-sm text-muted">
            <Package className="size-5 shrink-0" aria-hidden />
            <span>
              No orders yet.{' '}
              <Link href="/shop" className="text-ink underline-offset-2 hover:underline">
                Browse the shop
              </Link>
              .
            </span>
          </div>
        )}
      </section>

      <section aria-labelledby="soon-heading">
        <Heading as={2} id="soon-heading" size="md" className="mb-3">
          Coming soon
        </Heading>
        <ul className="grid gap-3 sm:grid-cols-3">
          {['Order history & tracking', 'Saved designs', 'Wishlist'].map((label) => (
            <li
              key={label}
              className="rounded-[var(--radius-lg)] border border-line p-4 text-sm text-muted"
            >
              {label}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
