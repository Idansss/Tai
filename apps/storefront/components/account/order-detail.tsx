'use client';

import { Alert, Badge, EmptyState, Heading, Price, Text, cn } from '@tms/ui';
import { Check, Package } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { findOrderInHistory } from '@/lib/account';
import { friendlyOrderStatus, orderTracking, type TrackingStep } from '@/lib/order-status';
import type { PlacedOrder } from '@/lib/order';
import { AccountShell } from './account-shell';
import { useRequireAuth } from './use-require-auth';

function TimelineRow({ step, last }: { step: TrackingStep; last: boolean }) {
  const done = step.state === 'done';
  const current = step.state === 'current';
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            'grid size-6 shrink-0 place-items-center rounded-full border',
            done && 'border-transparent bg-[var(--color-success)] text-white',
            current && 'border-accent-2 text-accent-2',
            !done && !current && 'border-line-2 text-muted',
          )}
          aria-hidden
        >
          {done ? (
            <Check className="size-3.5" />
          ) : (
            <span className={cn('size-2 rounded-full', current ? 'bg-accent-2' : 'bg-line-2')} />
          )}
        </span>
        {!last ? (
          <span
            className={cn('mt-1 w-px flex-1', done ? 'bg-[var(--color-success)]' : 'bg-line')}
          />
        ) : null}
      </div>
      <span
        className={cn(
          'pb-6 text-sm',
          current ? 'font-medium text-ink' : done ? 'text-ink-2' : 'text-muted',
        )}
      >
        {step.label}
        {current ? <span className="ml-2 text-xs text-accent-2">In progress</span> : null}
      </span>
    </li>
  );
}

export function OrderDetail({ reference }: { reference: string }) {
  const { user, ready } = useRequireAuth(`/account/orders/${reference}`);
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    setOrder(findOrderInHistory(user.email, reference));
    setLoaded(true);
  }, [user, reference]);

  const loading = !ready || !user || !loaded;

  if (!loading && !order) {
    return (
      <AccountShell title="Order" description="We couldn’t find this order.">
        <EmptyState
          icon={<Package className="size-6" aria-hidden />}
          title="Order not found"
          description="This order isn’t on your account. It may belong to a different email."
          action={
            <Link
              href="/account/orders"
              className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-on-accent outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            >
              Back to your orders
            </Link>
          }
        />
      </AccountShell>
    );
  }

  const tracking = order ? orderTracking(order.status) : null;

  return (
    <AccountShell
      title={order ? `Order ${order.reference}` : 'Order'}
      description={
        order
          ? `Placed ${new Date(order.placedAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}`
          : undefined
      }
      action={order ? <Badge tone="neutral">{friendlyOrderStatus(order.status)}</Badge> : undefined}
      loading={loading}
    >
      {order && tracking ? (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="space-y-8">
            {/* Tracking */}
            <section
              aria-labelledby="tracking-heading"
              className="rounded-[var(--radius-lg)] border border-line p-5"
            >
              <Heading as={2} id="tracking-heading" size="md">
                Tracking
              </Heading>
              <Alert tone={tracking.tone} title={tracking.headline} className="mt-4">
                {tracking.description}
              </Alert>
              {tracking.steps.length > 0 ? (
                <ol className="mt-6">
                  {tracking.steps.map((step, i) => (
                    <TimelineRow
                      key={step.label}
                      step={step}
                      last={i === tracking.steps.length - 1}
                    />
                  ))}
                </ol>
              ) : null}
              <Text size="sm" tone="muted" className="mt-2">
                Preview build, production status is simulated and will update live once the orders
                API is connected.
              </Text>
            </section>

            {/* Items */}
            <section aria-labelledby="items-heading">
              <Heading as={2} id="items-heading" size="md" className="mb-3">
                Items
              </Heading>
              <ul className="space-y-3">
                {order.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-[var(--radius-md)] border border-line p-4 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-ink">{item.artworkTitle}</span>
                      <span className="block text-xs text-muted">
                        {item.garment} · {item.colour} · {item.size}
                        {item.placement ? ` · ${item.placement}` : ''} · ×{item.quantity}
                      </span>
                    </span>
                    <Price
                      amountMinor={item.priceMinor * item.quantity}
                      currency={order.currency}
                      className="shrink-0 text-ink"
                    />
                  </li>
                ))}
              </ul>
            </section>

            {/* Delivery + contact */}
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
          </div>

          {/* Totals */}
          <aside
            aria-label="Order total"
            className="rounded-[var(--radius-lg)] border border-line bg-canvas-2 p-5 lg:sticky lg:top-24"
          >
            <Heading as={2} size="md" className="mb-4">
              Total
            </Heading>
            <dl className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="text-ink">
                  <Price amountMinor={order.totals.subtotalMinor} currency={order.currency} />
                </dd>
              </div>
              {order.totals.discountMinor > 0 ? (
                <div className="flex items-center justify-between text-accent-2">
                  <dt>Promotion</dt>
                  <dd>
                    −<Price amountMinor={order.totals.discountMinor} currency={order.currency} />
                  </dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd className="text-ink">
                  {order.totals.deliveryMinor === 0 ? (
                    'Free'
                  ) : (
                    <Price amountMinor={order.totals.deliveryMinor} currency={order.currency} />
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">VAT</dt>
                <dd className="text-ink">
                  <Price amountMinor={order.totals.taxMinor} currency={order.currency} />
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-2 text-base font-medium">
                <dt className="text-ink">Total</dt>
                <dd className="text-ink">
                  <Price amountMinor={order.totals.totalMinor} currency={order.currency} />
                </dd>
              </div>
            </dl>
            {order.status === 'PAYMENT_FAILED' || order.status === 'AWAITING_PAYMENT' ? (
              <Link
                href="/checkout/payment"
                className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-md bg-accent text-sm font-medium text-on-accent outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
              >
                Complete payment
              </Link>
            ) : null}
          </aside>
        </div>
      ) : null}
    </AccountShell>
  );
}
