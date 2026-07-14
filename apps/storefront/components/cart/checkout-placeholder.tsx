'use client';

import { Alert, Price, Skeleton } from '@tms/ui';
import Link from 'next/link';
import { useCart } from './cart-provider';

/**
 * Interim checkout surface for F3-001. The cart, promotion preview and totals
 * are real; the delivery/payment steps land in TMS-F3-002. Kept honest so the
 * Checkout CTA never leads to a dead end or a fake payment flow.
 */
export function CheckoutPlaceholder() {
  const { items, count, subtotalMinor, estimatedTotalMinor, promotion, ready } = useCart();
  const currency = items[0]?.currency ?? 'NGN';
  const discount = subtotalMinor - estimatedTotalMinor;

  if (!ready) return <Skeleton className="h-64 w-full max-w-xl" />;

  if (items.length === 0) {
    return (
      <Alert tone="info" title="Your bag is empty">
        Add a piece to your bag before checking out.{' '}
        <Link href="/shop" className="underline underline-offset-2">
          Browse the shop
        </Link>
        .
      </Alert>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <Alert tone="info" title="Checkout is being finalised">
        Delivery options and secure payment arrive next (TMS-F3-002). Your bag and any promotion are
        saved — nothing has been charged.
      </Alert>

      <dl className="space-y-1.5 rounded-[var(--radius-lg)] border border-line bg-canvas-2 p-5 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted">Items</dt>
          <dd className="text-ink">
            {count} garment{count === 1 ? '' : 's'}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd className="text-ink">
            <Price amountMinor={subtotalMinor} currency={currency} />
          </dd>
        </div>
        {promotion && discount > 0 ? (
          <div className="flex items-center justify-between text-accent">
            <dt>Promotion · {promotion.code}</dt>
            <dd>
              −<Price amountMinor={discount} currency={currency} />
            </dd>
          </div>
        ) : null}
        <div className="flex items-center justify-between border-t border-line pt-2 text-base font-medium">
          <dt className="text-ink">Estimated total</dt>
          <dd className="text-ink">
            <Price amountMinor={estimatedTotalMinor} currency={currency} />
          </dd>
        </div>
      </dl>

      <Link
        href="/cart"
        className="inline-flex h-11 items-center justify-center rounded-md border border-line-2 px-5 text-sm font-medium text-ink outline-none hover:bg-canvas-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
      >
        Back to bag
      </Link>
    </div>
  );
}
