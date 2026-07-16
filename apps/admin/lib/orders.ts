/**
 * Pure order helpers for the admin order table + detail, search, status
 * filtering, pagination and the lifecycle timeline. Framework-free so they can
 * be unit-tested and reused by the mock provider and the views.
 */

import type { OrderStatus } from '@tms/contracts';
import type { AdminOrderSummary } from './data/types';
import { formatOrderStatus } from './order-status';

export type StatusFilter = OrderStatus | 'all';

/** Does an order match a free-text query (reference / name / email)? */
export function matchesQuery(order: AdminOrderSummary, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    order.reference.toLowerCase().includes(q) ||
    order.customerName.toLowerCase().includes(q) ||
    order.customerEmail.toLowerCase().includes(q)
  );
}

/** Filter by free-text query and (optionally) a single status. */
export function filterOrders(
  orders: AdminOrderSummary[],
  opts: { query?: string; status?: StatusFilter } = {},
): AdminOrderSummary[] {
  const { query = '', status = 'all' } = opts;
  return orders.filter((o) => matchesQuery(o, query) && (status === 'all' || o.status === status));
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Clamp a 1-based page to the valid range and slice the items. */
export function paginate<T>(items: T[], page = 1, pageSize = 10): Paged<T> {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const start = (safePage - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total, page: safePage, pageSize };
}

/** Total number of pages for a result set. */
export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

// --- Lifecycle timeline --------------------------------------------------------

export interface TimelineEvent {
  status: OrderStatus;
  label: string;
  state: 'done' | 'current';
}

/** The happy-path order lifecycle, in order. */
const LIFECYCLE: OrderStatus[] = [
  'PAID',
  'PRODUCTION_QUEUED',
  'PRINTING',
  'QUALITY_CHECK',
  'READY_FOR_DISPATCH',
  'SHIPMENT_BOOKED',
  'SHIPPED',
  'DELIVERED',
];

/**
 * Build the lifecycle timeline for an order: every stage up to and including the
 * current status, most-recent last. Terminal/exception statuses that aren't on
 * the happy path (payment failure, cancellation, returns…) yield a single event
 * so the detail view still shows something meaningful.
 */
export function orderTimeline(status: OrderStatus): TimelineEvent[] {
  const idx = LIFECYCLE.indexOf(status);
  if (idx === -1) {
    return [{ status, label: formatOrderStatus(status), state: 'current' }];
  }
  return LIFECYCLE.slice(0, idx + 1).map((s, i) => ({
    status: s,
    label: formatOrderStatus(s),
    state: i === idx ? 'current' : 'done',
  }));
}
