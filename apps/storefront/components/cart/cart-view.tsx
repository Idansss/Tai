'use client';

import { EmptyState, Heading, Skeleton } from '@tms/ui';
import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/account/auth-provider';
import { CartLineList } from './cart-line-list';
import { CartSummary } from './cart-summary';
import { useCart } from './cart-provider';

/** Full-page bag: line items on the left, a sticky order summary on the right. */
export function CartView() {
  const { items, count, ready } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  if (!ready) {
    return (
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="size-6" aria-hidden />}
        title="Your bag is empty"
        description="Browse the gallery or design your own piece, everything you add is saved here."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/shop"
              className="inline-flex h-11 items-center justify-center rounded-md border border-line-2 px-5 text-sm font-medium text-ink outline-none hover:bg-canvas-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            >
              Browse the shop
            </Link>
            <Link
              href="/design-studio"
              className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-on-accent outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            >
              Open the Design Studio
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <section aria-label="Bag items">
        <Heading as={2} size="md" className="sr-only">
          Bag items
        </Heading>
        <CartLineList />
      </section>
      <aside
        aria-label="Order summary"
        className="rounded-[var(--radius-lg)] border border-line bg-canvas-2 p-5 lg:sticky lg:top-24"
      >
        <Heading as={2} size="md" className="mb-4">
          Order summary
        </Heading>
        <CartSummary onCheckout={() => router.push(user ? '/checkout' : '/login?next=/checkout')} />
        <p className="mt-3 text-center text-xs text-muted">
          {count} item{count === 1 ? '' : 's'} in your bag
        </p>
      </aside>
    </div>
  );
}
