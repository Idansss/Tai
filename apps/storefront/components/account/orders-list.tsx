'use client';

import { Badge, EmptyState, Price, Text } from '@tms/ui';
import { Package } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { readOrderHistory } from '@/lib/account';
import { friendlyOrderStatus } from '@/lib/order-status';
import type { PlacedOrder } from '@/lib/order';
import { AccountShell } from './account-shell';
import { useRequireAuth } from './use-require-auth';

function toneForStatus(order: PlacedOrder): 'success' | 'warning' | 'neutral' | 'info' {
  if (order.status === 'PAYMENT_FAILED' || order.status === 'PAYMENT_CANCELLED') return 'neutral';
  if (order.status === 'DELIVERY_EXCEPTION') return 'warning';
  if (order.status === 'AWAITING_PAYMENT' || order.status === 'PAYMENT_PROCESSING') return 'info';
  return 'success';
}

function itemCount(order: PlacedOrder): number {
  return order.items.reduce((n, i) => n + i.quantity, 0);
}

export function OrdersList() {
  const { user, ready } = useRequireAuth('/account/orders');
  const [orders, setOrders] = useState<PlacedOrder[] | null>(null);

  useEffect(() => {
    if (user) setOrders(readOrderHistory(user.email));
  }, [user]);

  const loading = !ready || !user || orders === null;

  return (
    <AccountShell
      title="Your orders"
      description="Track and revisit your orders."
      loading={loading}
    >
      {orders && orders.length === 0 ? (
        <EmptyState
          icon={<Package className="size-6" aria-hidden />}
          title="No orders yet"
          description="When you place an order it appears here with live status and tracking."
          action={
            <Link
              href="/shop"
              className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-on-accent outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            >
              Browse the shop
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {orders?.map((order) => (
            <li key={order.reference}>
              <Link
                href={`/account/orders/${order.reference}`}
                className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-line bg-canvas-2 p-5 outline-none hover:border-line-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-ink">{order.reference}</span>
                    <Badge tone={toneForStatus(order)}>{friendlyOrderStatus(order.status)}</Badge>
                  </div>
                  <Text size="sm" tone="muted" className="mt-1">
                    {new Date(order.placedAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    · {itemCount(order)} item{itemCount(order) === 1 ? '' : 's'}
                  </Text>
                </div>
                <Price
                  amountMinor={order.totals.totalMinor}
                  currency={order.currency}
                  className="shrink-0 text-ink"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}
