'use client';

import { Badge, Eyebrow, Heading, Price, Skeleton, Text } from '@tms/ui';
import {
  ArrowRight,
  Award,
  ChevronRight,
  Heart,
  LogOut,
  Package,
  Palette,
  UserRound,
} from 'lucide-react';
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

/** Up to two initials from a name, falling back to the email's first letter. */
function initialsOf(name: string, email: string): string {
  const fromName = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
  return fromName || email[0]?.toUpperCase() || '?';
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
  const initials = initialsOf(user.name, user.email);

  const stats = [
    { href: '/account/orders', label: 'Orders', value: counts.orders },
    { href: '/account/saved-designs', label: 'Saved', value: counts.savedDesigns },
    { href: '/account/wishlist', label: 'Wishlist', value: wishlistCount },
  ] as const;

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
      href: '/account/loyalty',
      label: 'Loyalty & referrals',
      description: 'Points, rewards & your referral link',
      icon: Award,
      count: null,
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
      {/* Identity card — avatar, name and an at-a-glance stats strip. */}
      <section
        aria-labelledby="account-heading"
        className="overflow-hidden rounded-[var(--radius-xl)] border border-line bg-gradient-to-br from-canvas-2 to-elevated"
      >
        <div className="flex flex-wrap items-center justify-between gap-5 p-6 sm:p-8">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            <span
              aria-hidden
              className="grid size-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent to-accent-2 font-display text-xl font-semibold text-on-accent shadow-sm ring-1 ring-black/5 sm:size-20 sm:text-2xl"
            >
              {initials}
            </span>
            <div className="min-w-0">
              <Eyebrow>Your account</Eyebrow>
              <Heading as={1} id="account-heading" size="display-lg" className="mt-1 truncate">
                {user.name}
              </Heading>
              <Text tone="muted" size="sm" className="mt-1 truncate">
                {user.email}
              </Text>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSigningOut(true);
              logout();
              router.push('/');
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-line-2 px-5 text-sm font-medium text-ink outline-none transition-colors hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </div>

        <div className="grid grid-cols-3 divide-x divide-line border-t border-line">
          {stats.map(({ href, label, value }) => (
            <Link
              key={label}
              href={href}
              className="group px-3 py-4 text-center outline-none transition-colors hover:bg-canvas focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] sm:py-5"
            >
              <span className="block font-display text-2xl font-semibold tabular-nums text-ink sm:text-3xl">
                {value}
              </span>
              <span className="mt-0.5 block text-[0.7rem] uppercase tracking-[0.12em] text-muted transition-colors group-hover:text-ink">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent order */}
      <section aria-labelledby="recent-heading">
        <Heading as={2} id="recent-heading" size="md" className="mb-3">
          Recent order
        </Heading>
        {recentOrder ? (
          <Link
            href={`/account/orders/${recentOrder.reference}`}
            className="group flex flex-wrap items-center gap-4 rounded-[var(--radius-lg)] border border-line bg-canvas-2 p-5 outline-none transition-colors hover:border-line-2 hover:bg-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
              <Package className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-3">
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
            <ArrowRight
              className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink motion-reduce:transition-none"
              aria-hidden
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
                className="group flex items-center gap-4 rounded-[var(--radius-lg)] border border-line bg-canvas-2 p-4 outline-none transition-[transform,border-color,background-color] hover:-translate-y-0.5 hover:border-line-2 hover:bg-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] motion-reduce:hover:translate-y-0"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-on-accent">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-medium text-ink">
                    {label}
                    {count !== null && count > 0 ? <Badge tone="accent">{count}</Badge> : null}
                  </span>
                  <span className="block text-xs text-muted">{description}</span>
                </span>
                <ChevronRight
                  className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink motion-reduce:transition-none"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
