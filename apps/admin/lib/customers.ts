/**
 * Pure customer helpers, derive a customer directory from order history
 * (customers reconcile on their contact email, mirroring the storefront's
 * guest-order association), classify lifecycle status, and filter/sort.
 * Framework-free so it can be unit-tested and shared by the customer views.
 */

import type { OrderStatus } from '@tms/contracts';
import type {
  AdminCustomerOrderRow,
  AdminCustomerProfile,
  AdminCustomerSummary,
  CustomerStatus,
} from './data/types';

/** The narrow order shape the derivation needs (an order maps onto this). */
export interface CustomerOrderInput {
  reference: string;
  customerName: string;
  customerEmail: string;
  phone: string;
  city: string;
  state: string;
  placedAt: string;
  status: OrderStatus;
  /** Whether payment succeeded (counts toward spend). */
  paid: boolean;
  itemCount: number;
  totalMinor: number;
  currency: string;
}

/** Stable customer id = the normalised contact email. */
export function customerId(email: string): string {
  return email.trim().toLowerCase();
}

/** A customer is dormant once their last order is older than this. */
export const DORMANT_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export function customerStatus(
  orderCount: number,
  lastOrderAt: string,
  now: Date = new Date(),
): CustomerStatus {
  const ageMs = now.getTime() - new Date(lastOrderAt).getTime();
  if (ageMs > DORMANT_DAYS * DAY_MS) return 'dormant';
  if (orderCount <= 1) return 'new';
  return 'active';
}

/** Group orders into customer summaries, most-recent-order first. */
export function deriveCustomers(
  orders: CustomerOrderInput[],
  now: Date = new Date(),
): AdminCustomerSummary[] {
  const byEmail = new Map<string, CustomerOrderInput[]>();
  for (const o of orders) {
    const id = customerId(o.customerEmail);
    const list = byEmail.get(id);
    if (list) list.push(o);
    else byEmail.set(id, [o]);
  }

  const customers: AdminCustomerSummary[] = [];
  for (const [id, list] of byEmail) {
    const sorted = [...list].sort((a, b) => b.placedAt.localeCompare(a.placedAt));
    const latest = sorted[0]!;
    const totalSpentMinor = sorted.filter((o) => o.paid).reduce((sum, o) => sum + o.totalMinor, 0);
    customers.push({
      id,
      name: latest.customerName,
      email: latest.customerEmail,
      orderCount: sorted.length,
      totalSpentMinor,
      currency: latest.currency,
      lastOrderAt: latest.placedAt,
      status: customerStatus(sorted.length, latest.placedAt, now),
    });
  }

  return customers.sort((a, b) => b.lastOrderAt.localeCompare(a.lastOrderAt));
}

/** Build a full profile for one customer, or null when unknown. */
export function deriveCustomerProfile(
  orders: CustomerOrderInput[],
  id: string,
  now: Date = new Date(),
): AdminCustomerProfile | null {
  const wanted = customerId(id);
  const list = orders.filter((o) => customerId(o.customerEmail) === wanted);
  if (list.length === 0) return null;

  const sorted = [...list].sort((a, b) => b.placedAt.localeCompare(a.placedAt));
  const latest = sorted[0]!;
  const totalSpentMinor = sorted.filter((o) => o.paid).reduce((sum, o) => sum + o.totalMinor, 0);
  const orderRows: AdminCustomerOrderRow[] = sorted.map((o) => ({
    reference: o.reference,
    placedAt: o.placedAt,
    status: o.status,
    itemCount: o.itemCount,
    totalMinor: o.totalMinor,
    currency: o.currency,
  }));

  return {
    id: wanted,
    name: latest.customerName,
    email: latest.customerEmail,
    orderCount: sorted.length,
    totalSpentMinor,
    currency: latest.currency,
    lastOrderAt: latest.placedAt,
    status: customerStatus(sorted.length, latest.placedAt, now),
    phone: latest.phone,
    city: latest.city,
    state: latest.state,
    orders: orderRows,
    // Representative until the account API lands (TMS-FBR-005).
    savedDesigns: sorted.reduce((n, o) => n + o.itemCount, 0) % 4,
  };
}

// --- Filtering -----------------------------------------------------------------

export interface CustomerFilterParams {
  query?: string;
  status?: CustomerStatus | 'all';
}

export function filterCustomers(
  customers: AdminCustomerSummary[],
  params: CustomerFilterParams = {},
): AdminCustomerSummary[] {
  const q = (params.query ?? '').trim().toLowerCase();
  const status = params.status ?? 'all';
  return customers.filter((c) => {
    const matchesStatus = status === 'all' || c.status === status;
    const matchesQuery =
      !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });
}
