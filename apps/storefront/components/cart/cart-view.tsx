'use client';

import { Heading, Skeleton } from '@tms/ui';
import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PillLink } from '@/components/site/pill-link';
import { CartLineList } from './cart-line-list';
import { CartSummary } from './cart-summary';
import { useCart } from './cart-provider';

/** Full-page bag: line items on the left, a sticky order summary on the right. */
export function CartView() {
  // Read the lines from the cart view, not the local items array: in server mode the local
  // array is always empty, and checking it would show "your bag is empty" over a full bag.
  const { cart, count, ready } = useCart();
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

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <ShoppingBag className="size-8 text-ink" aria-hidden />
        <div className="max-w-md">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Shopping bag
          </p>
          <h2 className="mt-3 font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight text-ink sm:text-5xl">
            Empty for now
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
            Browse the gallery or design your own piece — everything you add is saved here.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <PillLink href="/design-studio">Design studio</PillLink>
          <Link
            href="/shop"
            className="text-xs font-medium uppercase tracking-[0.08em] text-muted underline-offset-4 outline-none hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          >
            Browse the shop
          </Link>
        </div>
      </div>
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
        <Heading
          as={2}
          size="md"
          className="mb-4 font-display text-sm font-bold uppercase tracking-wide"
        >
          Order summary
        </Heading>
        <CartSummary onCheckout={() => router.push('/checkout')} />
        <p className="mt-3 text-center text-xs text-muted">
          {count} item{count === 1 ? '' : 's'} in your bag
        </p>
      </aside>
    </div>
  );
}
