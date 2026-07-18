'use client';

import { Alert, Badge, Skeleton, Text, cn } from '@tms/ui';
import { AdminPageHeader } from '@/components/admin-page-header';
import type { OrderStatus } from '@tms/contracts';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { adminDataProvider, type AdminOrderListResult } from '@/lib/data';
import { formatOrderStatus, orderStatusTone } from '@/lib/order-status';
import { pageCount, type StatusFilter } from '@/lib/orders';

const PAGE_SIZE = 10;

const STATUS_OPTIONS: OrderStatus[] = [
  'PAID',
  'PRODUCTION_QUEUED',
  'PRINTING',
  'QUALITY_CHECK',
  'READY_FOR_DISPATCH',
  'SHIPMENT_BOOKED',
  'SHIPPED',
  'DELIVERED',
  'AWAITING_PAYMENT',
  'PAYMENT_FAILED',
  'DELIVERY_EXCEPTION',
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const controlClass =
  'h-10 rounded-md border border-line-2 bg-canvas px-3 text-sm text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]';

export function OrdersView() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AdminOrderListResult | null>(null);
  const [loading, setLoading] = useState(true);

  // Reset to the first page when the filters change.
  useEffect(() => {
    setPage(1);
  }, [query, status]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    adminDataProvider
      .listOrders({ query, status, page, pageSize: PAGE_SIZE })
      .then((res) => {
        if (active) {
          setResult(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query, status, page]);

  const pages = useMemo(() => (result ? pageCount(result.total, result.pageSize) : 1), [result]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Fulfilment"
        title="Orders"
        lead="Search, filter and open orders to manage payment, production and fulfilment."
      />

      <Alert tone="info" title="Preview data">
        Orders below are representative sample data — the admin order API isn’t connected yet.
      </Alert>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <label htmlFor="order-search" className="sr-only">
            Search orders
          </label>
          <input
            id="order-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reference, name or email"
            className={cn(controlClass, 'w-full pl-9')}
          />
        </div>
        <div>
          <label htmlFor="order-status" className="sr-only">
            Filter by status
          </label>
          <select
            id="order-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className={controlClass}
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {formatOrderStatus(s)}
              </option>
            ))}
          </select>
        </div>
        {result ? (
          <span className="text-sm text-muted" aria-live="polite">
            {result.total} order{result.total === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>

      {/* Table */}
      {loading && !result ? (
        <Skeleton className="h-80 w-full" />
      ) : result && result.items.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line p-10 text-center">
          <Text tone="muted">No orders match your search.</Text>
        </div>
      ) : (
        <div
          className={cn(
            'overflow-x-auto rounded-[var(--radius-lg)] border border-line transition-opacity',
            loading && 'opacity-60',
          )}
        >
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b border-line bg-surface text-left text-xs uppercase tracking-[0.06em] text-muted">
                <th scope="col" className="px-4 py-3 font-medium">
                  Reference
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Customer
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Date
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {result?.items.map((o) => (
                <tr
                  key={o.reference}
                  className="border-b border-line last:border-b-0 hover:bg-canvas-2"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/orders/${o.reference}`}
                      className="rounded-sm font-medium text-ink underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                    >
                      {o.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block text-ink-2">{o.customerName}</span>
                    <span className="block text-xs text-muted">{o.customerEmail}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-2">{formatDate(o.placedAt)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={orderStatusTone(o.status)}>{formatOrderStatus(o.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink">
                    ₦{Math.round(o.totalMinor / 100).toLocaleString('en-NG')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {result && pages > 1 ? (
        <nav className="flex items-center justify-between gap-3" aria-label="Orders pagination">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={result.page <= 1}
            className="inline-flex h-9 items-center rounded-md border border-line-2 px-3 text-sm text-ink outline-none hover:bg-canvas-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-muted">
            Page {result.page} of {pages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={result.page >= pages}
            className="inline-flex h-9 items-center rounded-md border border-line-2 px-3 text-sm text-ink outline-none hover:bg-canvas-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </nav>
      ) : null}
    </div>
  );
}
