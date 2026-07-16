/**
 * Customer-facing order status + tracking timeline.
 *
 * MASTER_PRODUCT_SPEC §17 requires the account to show *understandable* order
 * states ("Order confirmed", "Preparing your shirt", "Printing", …) and to
 * **never expose raw provider status codes**. This module maps the
 * `OrderStatus` enum from `@tms/contracts` to friendly copy and an ordered
 * fulfilment timeline. It is pure so it can be unit-tested and reused by the
 * orders list and order-detail surfaces.
 *
 * The real production status advances server-side (TMS-FBR-004); today's mock
 * orders only reach `PAID` at most, which the timeline renders honestly.
 */

import type { OrderStatus } from '@tms/contracts';

export type TimelineState = 'done' | 'current' | 'upcoming';

export interface TrackingStep {
  label: string;
  state: TimelineState;
}

export type TrackingTone = 'success' | 'info' | 'warning' | 'error';

export interface OrderTracking {
  /** Short, human status headline (never a raw code). */
  headline: string;
  /** One-line explanation of what is happening now. */
  description: string;
  tone: TrackingTone;
  /** Ordered fulfilment steps, or an empty list when a timeline doesn't apply. */
  steps: TrackingStep[];
}

/** The happy-path fulfilment journey shown to customers. */
const FULFILMENT_STEPS = [
  'Order confirmed',
  'Preparing your piece',
  'Printing',
  'Quality check',
  'Ready for dispatch',
  'Shipment booked',
  'In transit',
  'Delivered',
] as const;

/**
 * Index of the fulfilment step an order has *reached*, or -1 when the order has
 * not yet been confirmed (awaiting/failed payment, cancelled, returns, etc.).
 */
function reachedStepIndex(status: OrderStatus): number {
  switch (status) {
    case 'PAID':
      return 0;
    case 'PRODUCTION_QUEUED':
      return 1;
    case 'PRINTING':
      return 2;
    case 'QUALITY_CHECK':
      return 3;
    case 'READY_FOR_DISPATCH':
      return 4;
    case 'SHIPMENT_BOOKED':
      return 5;
    case 'SHIPPED':
    case 'DELIVERY_EXCEPTION':
      return 6;
    case 'DELIVERED':
    case 'COMPLETED':
      return 7;
    default:
      return -1;
  }
}

function buildSteps(reached: number, finished = false): TrackingStep[] {
  return FULFILMENT_STEPS.map((label, i) => ({
    label,
    state:
      i < reached || (finished && i === reached) ? 'done' : i === reached ? 'current' : 'upcoming',
  }));
}

/** A short, human status label for lists — never a raw provider code. */
export function friendlyOrderStatus(status: OrderStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'Draft';
    case 'AWAITING_PAYMENT':
      return 'Awaiting payment';
    case 'PAYMENT_PROCESSING':
      return 'Confirming payment';
    case 'PAID':
      return 'Order confirmed';
    case 'PRODUCTION_QUEUED':
      return 'Preparing your piece';
    case 'PRINTING':
      return 'Printing';
    case 'QUALITY_CHECK':
      return 'Quality check';
    case 'READY_FOR_DISPATCH':
      return 'Ready for dispatch';
    case 'SHIPMENT_BOOKED':
      return 'Shipment booked';
    case 'SHIPPED':
      return 'In transit';
    case 'DELIVERED':
      return 'Delivered';
    case 'COMPLETED':
      return 'Completed';
    case 'PAYMENT_FAILED':
      return 'Payment unsuccessful';
    case 'PAYMENT_CANCELLED':
      return 'Payment cancelled';
    case 'CANCEL_REQUESTED':
      return 'Cancellation requested';
    case 'CANCELLED':
      return 'Cancelled';
    case 'REFUND_PENDING':
      return 'Refund pending';
    case 'PARTIALLY_REFUNDED':
      return 'Partially refunded';
    case 'REFUNDED':
      return 'Refunded';
    case 'DELIVERY_EXCEPTION':
      return 'Delivery needs attention';
    case 'RETURN_REQUESTED':
      return 'Return requested';
    case 'RETURN_APPROVED':
      return 'Return approved';
    case 'RETURN_IN_TRANSIT':
      return 'Return in transit';
    case 'RETURNED':
      return 'Returned';
    default:
      return 'Processing';
  }
}

/** Full tracking view model for the order-detail timeline. */
export function orderTracking(status: OrderStatus): OrderTracking {
  const headline = friendlyOrderStatus(status);

  // Pre-confirmation and terminal/exception states don't show the linear
  // production timeline — they get their own honest explanation instead.
  switch (status) {
    case 'DRAFT':
    case 'AWAITING_PAYMENT':
    case 'PAYMENT_PROCESSING':
      return {
        headline,
        description: 'Your order is saved. It moves into production once payment is confirmed.',
        tone: 'info',
        steps: [],
      };
    case 'PAYMENT_FAILED':
    case 'PAYMENT_CANCELLED':
      return {
        headline,
        description:
          'Payment did not complete, so this order is on hold. You can try paying again.',
        tone: 'error',
        steps: [],
      };
    case 'CANCEL_REQUESTED':
    case 'CANCELLED':
      return {
        headline,
        description: 'This order has been cancelled. Any payment taken is refunded.',
        tone: 'warning',
        steps: [],
      };
    case 'REFUND_PENDING':
    case 'PARTIALLY_REFUNDED':
    case 'REFUNDED':
      return {
        headline,
        description: 'A refund is being processed for this order.',
        tone: 'info',
        steps: [],
      };
    case 'RETURN_REQUESTED':
    case 'RETURN_APPROVED':
    case 'RETURN_IN_TRANSIT':
    case 'RETURNED':
      return {
        headline,
        description: 'A return is in progress for this order.',
        tone: 'info',
        steps: [],
      };
    default:
      break;
  }

  const reached = reachedStepIndex(status);
  const finished = status === 'DELIVERED' || status === 'COMPLETED';
  const steps = buildSteps(reached, finished);

  if (status === 'DELIVERY_EXCEPTION') {
    return {
      headline: 'Delivery needs attention',
      description:
        'The courier hit a problem delivering your order. We’re on it and will be in touch.',
      tone: 'warning',
      steps,
    };
  }

  if (status === 'DELIVERED' || status === 'COMPLETED') {
    return {
      headline,
      description: 'Your order has been delivered. We hope you love it.',
      tone: 'success',
      steps,
    };
  }

  return {
    headline,
    description: 'Your order is confirmed and moving through production and dispatch.',
    tone: 'success',
    steps,
  };
}
