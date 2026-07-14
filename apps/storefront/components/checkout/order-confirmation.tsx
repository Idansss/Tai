'use client';

import { Alert, EmptyState, Heading, Price, Skeleton, Text } from '@tms/ui';
import { CheckCircle2, Package } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { type PlacedOrder, readLastOrder } from '@/lib/order';

function Row({
  label,
  children,
  strong,
}: {
  label: string;
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div
      className={
        strong
          ? 'flex items-center justify-between border-t border-line pt-2 text-base font-medium'
          : 'flex items-center justify-between text-sm'
      }
    >
      <dt className={strong ? 'text-ink' : 'text-muted'}>{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}

export function OrderConfirmation() {
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [ready, setReady] = useState(false);

  // Read once on mount — the order was persisted by the checkout flow.
  useEffect(() => {
    setOrder(readLastOrder());
    setReady(true);
  }, []);

  if (!ready) return <Skeleton className="h-96 w-full max-w-2xl" />;

  if (!order) {
    return (
      <EmptyState
        icon={<Package className="size-6" aria-hidden />}
        title="No recent order"
        description="Once you place an order its confirmation appears here."
        action={
          <Link
            href="/shop"
            className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-on-accent outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          >
            Browse the shop
          </Link>
        }
      />
    );
  }

  const { totals, currency } = order;

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 size-7 shrink-0 text-[var(--color-success)]" aria-hidden />
        <div>
          <Heading as={1} size="display-lg">
            Order received
          </Heading>
          <Text tone="secondary" className="mt-1">
            Thank you, {order.delivery.fullName.split(' ')[0] || 'friend'}. Your order reference is{' '}
            <span className="font-medium text-ink">{order.reference}</span>. A confirmation has been
            sent to {order.contact.email}.
          </Text>
        </div>
      </div>

      <Alert tone="info" title="Payment pending">
        This preview records your order but does not take payment. Secure Flutterwave payment and
        the live payment states arrive in the next release — nothing has been charged.
      </Alert>

      <section className="rounded-[var(--radius-lg)] border border-line bg-canvas-2 p-5">
        <Heading as={2} size="md" className="mb-4">
          Summary
        </Heading>
        <ul className="mb-4 space-y-3">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
              <span className="min-w-0">
                <span className="block truncate text-ink">{item.artworkTitle}</span>
                <span className="block text-xs text-muted">
                  {item.garment} · {item.colour} · {item.size} · ×{item.quantity}
                </span>
              </span>
              <Price
                amountMinor={item.priceMinor * item.quantity}
                currency={currency}
                className="shrink-0 text-ink"
              />
            </li>
          ))}
        </ul>
        <dl className="space-y-1.5 border-t border-line pt-4">
          <Row label="Subtotal">
            <Price amountMinor={totals.subtotalMinor} currency={currency} />
          </Row>
          {totals.discountMinor > 0 ? (
            <Row label="Promotion">
              −<Price amountMinor={totals.discountMinor} currency={currency} />
            </Row>
          ) : null}
          <Row label={`Delivery — ${order.deliveryOptionLabel}`}>
            {totals.deliveryMinor === 0 ? (
              'Free'
            ) : (
              <Price amountMinor={totals.deliveryMinor} currency={currency} />
            )}
          </Row>
          <Row label="VAT (7.5%)">
            <Price amountMinor={totals.taxMinor} currency={currency} />
          </Row>
          <Row label="Total" strong>
            <Price amountMinor={totals.totalMinor} currency={currency} />
          </Row>
        </dl>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <div>
          <Heading as={2} size="md">
            Delivery
          </Heading>
          <address className="mt-2 text-sm not-italic text-ink-2">
            {order.delivery.fullName}
            <br />
            {order.delivery.addressLine1}
            {order.delivery.addressLine2 ? (
              <>
                <br />
                {order.delivery.addressLine2}
              </>
            ) : null}
            <br />
            {order.delivery.city}, {order.delivery.state}
          </address>
          <Text size="sm" tone="muted" className="mt-2">
            {order.deliveryOptionLabel} · {order.deliveryEta}
          </Text>
        </div>
        <div>
          <Heading as={2} size="md">
            Contact
          </Heading>
          <Text size="sm" className="mt-2 text-ink-2">
            {order.contact.email}
            <br />
            {order.contact.phone}
          </Text>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/shop"
          className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-on-accent outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          Continue shopping
        </Link>
        <Link
          href="/design-studio"
          className="inline-flex h-11 items-center justify-center rounded-md border border-line-2 px-5 text-sm font-medium text-ink outline-none hover:bg-canvas-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          Design another piece
        </Link>
      </div>
    </div>
  );
}
