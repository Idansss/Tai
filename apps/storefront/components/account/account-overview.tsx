'use client';

import { Badge, Heading, Price, Skeleton, Text } from '@tms/ui';
import { ChevronRight, Heart, Package, Palette, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { readOrderHistory, readSavedDesigns } from '@/lib/account';
import { friendlyOrderStatus } from '@/lib/order-status';
import type { PlacedOrder } from '@/lib/order';
import { useAuth } from './auth-provider';
import { useWishlist } from './wishlist-provider';

interface Counts {
  orders: number;
  savedDesigns: number;
}

export function AccountOverview() {
  const { user, ready, logout } = useAuth();
  const { count: wishlistCount } = useWishlist();
  const router = useRouter();
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const [counts, setCounts] = useState<Counts>({ orders: 0, savedDesigns: 0 });
  const [signingOut, setSigningOut] = useState(false);

  // Redirect guests to sign in once the session has hydrated. An explicit
  // sign-out navigates home instead, so skip the redirect in that case.
  useEffect(() => {
    if (ready && !user && !signingOut) router.replace('/login?next=/account');
  }, [ready, user, router, signingOut]);

  useEffect(() => {
    if (!user) return;
    const history = readOrderHistory(user.email);
    setOrders(history);
    setCounts({ orders: history.length, savedDesigns: readSavedDesigns(user.email).length });
  }, [user]);

  if (!ready || !user) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-40 w-full max-w-xl" />
      </div>
    );
  }

  const recentOrder = orders[0] ?? null;

  const tiles = [
    {
      href: '/account/orders',
      label: 'Orders',
      description: 'Status & tracking',
      icon: Package,
      count: counts.orders,
    },
    {
      href: '/account/saved-designs',
      label: 'Saved designs',
      description: 'Your studio creations',
      icon: Palette,
      count: counts.savedDesigns,
    },
    {
      href: '/account/wishlist',
      label: 'Wishlist',
      description: 'Saved pieces',
      icon: Heart,
      count: wishlistCount,
    },
    {
      href: '/account/profile',
      label: 'Profile',
      description: 'Your details',
      icon: UserRound,
      count: null,
    },
  ] as const;

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
            setSigningOut(true);
            logout();
            router.push('/');
          }}
          className="inline-flex h-11 items-center justify-center rounded-md border border-line-2 px-5 text-sm font-medium text-ink outline-none hover:bg-canvas-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          Sign out
        </button>
      </div>

      {/* Recent order */}
      <section aria-labelledby="recent-heading">
        <Heading as={2} id="recent-heading" size="md" className="mb-3">
          Recent order
        </Heading>
        {recentOrder ? (
          <Link
            href={`/account/orders/${recentOrder.reference}`}
            className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-line bg-canvas-2 p-5 outline-none hover:border-line-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          >
            <span className="min-w-0">
              <span className="flex items-center gap-3">
                <span className="text-sm font-medium text-ink">{recentOrder.reference}</span>
                <Badge tone="neutral">{friendlyOrderStatus(recentOrder.status)}</Badge>
              </span>
              <span className="mt-1 block text-xs text-muted">
                {new Date(recentOrder.placedAt).toLocaleDateString()} ·{' '}
                {recentOrder.items.reduce((n, i) => n + i.quantity, 0)} item(s)
              </span>
            </span>
            <Price
              amountMinor={recentOrder.totals.totalMinor}
              currency={recentOrder.currency}
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

      {/* Account hub */}
      <section aria-labelledby="manage-heading">
        <Heading as={2} id="manage-heading" size="md" className="mb-3">
          Manage
        </Heading>
        <ul className="grid gap-3 sm:grid-cols-2">
          {tiles.map(({ href, label, description, icon: Icon, count }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-line p-4 outline-none hover:border-line-2 hover:bg-canvas-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-canvas-2 text-ink">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-medium text-ink">
                    {label}
                    {count !== null && count > 0 ? <Badge tone="accent">{count}</Badge> : null}
                  </span>
                  <span className="block text-xs text-muted">{description}</span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
