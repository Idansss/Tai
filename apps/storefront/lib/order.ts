/**
 * Placed-order model. Until the orders API exists (TMS-FBR-004) a completed
 * checkout snapshots the bag + details client-side so the confirmation page
 * can render. This is NOT a real payment — the mock flow marks the order
 * "awaiting payment"; Flutterwave + payment states arrive in TMS-F3-003.
 */

import type { OrderStatus, PaymentStatus } from '@tms/contracts';
import type { CartItem } from './cart';
import type { ContactDetails, DeliveryDetails, OrderTotals, PaymentMethod } from './checkout';

export interface PlacedOrder {
  reference: string;
  placedAt: string;
  currency: string;
  items: CartItem[];
  contact: ContactDetails;
  delivery: DeliveryDetails;
  deliveryOptionLabel: string;
  deliveryEta: string;
  paymentMethod: PaymentMethod;
  totals: OrderTotals;
  /** Lifecycle status (subset used by the mock checkout). */
  status: OrderStatus;
  /** Payment lifecycle status from the (mock) provider. */
  paymentStatus: PaymentStatus;
}

const LAST_ORDER_KEY = 'tms.lastOrder.v1';

/** Human, unambiguous order reference, e.g. "TMS-7Q4M2K". */
export function createOrderReference(random: () => number = Math.random): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusable 0/O/1/I
  let out = '';
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[Math.floor(random() * alphabet.length)];
  }
  return `TMS-${out}`;
}

export function saveLastOrder(order: PlacedOrder): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
  } catch {
    // Storage unavailable — the confirmation page will show its empty state.
  }
}

export function readLastOrder(): PlacedOrder | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LAST_ORDER_KEY);
    return raw ? (JSON.parse(raw) as PlacedOrder) : null;
  } catch {
    return null;
  }
}

/** Merge a patch into the stored order (e.g. status after a payment result). */
export function updateLastOrder(patch: Partial<PlacedOrder>): PlacedOrder | null {
  const current = readLastOrder();
  if (!current) return null;
  const next = { ...current, ...patch };
  saveLastOrder(next);
  return next;
}

export function clearLastOrder(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LAST_ORDER_KEY);
  } catch {
    // no-op
  }
}
