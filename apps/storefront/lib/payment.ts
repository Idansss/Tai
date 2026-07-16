/**
 * Mock payment resolution for the preview checkout. There is no real provider
 * yet (Flutterwave lands with TMS-FBR-004 / the payment API), so a placed order
 * is resolved to one of three states here, client-side. No money moves.
 *
 * The natural checkout flow resolves to `success`. The `pending` and `failure`
 * states are reachable for review/testing via `/checkout/payment?outcome=…`;
 * retrying from the failure screen drops the param and therefore succeeds.
 */

import type { OrderStatus, PaymentStatus } from '@tms/contracts';

export type PaymentOutcome = 'success' | 'pending' | 'failure';

const OUTCOMES: readonly PaymentOutcome[] = ['success', 'pending', 'failure'];

/** Parse the simulated outcome from a query value; defaults to success. */
export function parseOutcome(value: string | null | undefined): PaymentOutcome {
  const v = (value ?? '').trim().toLowerCase();
  return (OUTCOMES as readonly string[]).includes(v) ? (v as PaymentOutcome) : 'success';
}

export interface OutcomeStatuses {
  order: OrderStatus;
  payment: PaymentStatus;
}

/** Map a resolved outcome to the order + payment lifecycle statuses. */
export function outcomeToStatuses(outcome: PaymentOutcome): OutcomeStatuses {
  switch (outcome) {
    case 'success':
      return { order: 'PAID', payment: 'SUCCEEDED' };
    case 'pending':
      return { order: 'PAYMENT_PROCESSING', payment: 'PENDING' };
    case 'failure':
      return { order: 'PAYMENT_FAILED', payment: 'FAILED' };
  }
}

/** Whether the bag should be emptied for this outcome (kept for retry on failure). */
export function shouldClearCart(outcome: PaymentOutcome): boolean {
  return outcome !== 'failure';
}
