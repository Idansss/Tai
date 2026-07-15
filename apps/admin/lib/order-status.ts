import type { OrderStatus, PaymentStatus, ShippingStatus } from '@tms/contracts';

/**
 * Admin-side order status presentation. Staff see precise operational states
 * (unlike the customer account, which uses friendlier copy), but we still render
 * a readable label and a tone rather than the raw SCREAMING_SNAKE enum.
 */

export type StatusTone = 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'accent';

/** Title-case a status enum, e.g. "READY_FOR_DISPATCH" → "Ready for dispatch". */
export function formatEnumLabel(value: string): string {
  const lower = value.toLowerCase().replace(/_/g, ' ');
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function formatOrderStatus(status: OrderStatus): string {
  return formatEnumLabel(status);
}

export function formatPaymentStatus(status: PaymentStatus): string {
  return formatEnumLabel(status);
}

export function formatShippingStatus(status: ShippingStatus): string {
  return formatEnumLabel(status);
}

export function paymentStatusTone(status: PaymentStatus): StatusTone {
  switch (status) {
    case 'SUCCEEDED':
      return 'success';
    case 'FAILED':
    case 'CANCELLED':
    case 'REVERSED':
    case 'DISPUTED':
      return 'error';
    case 'PENDING':
    case 'PROCESSING':
      return 'warning';
    case 'REFUNDED':
    case 'PARTIALLY_REFUNDED':
      return 'info';
    default:
      return 'neutral';
  }
}

/** Badge tone for a status, grouping the lifecycle into a small palette. */
export function orderStatusTone(status: OrderStatus): StatusTone {
  switch (status) {
    case 'PAID':
    case 'DELIVERED':
    case 'COMPLETED':
      return 'success';
    case 'PAYMENT_FAILED':
    case 'PAYMENT_CANCELLED':
    case 'CANCELLED':
    case 'DELIVERY_EXCEPTION':
      return 'error';
    case 'AWAITING_PAYMENT':
    case 'PAYMENT_PROCESSING':
    case 'REFUND_PENDING':
    case 'RETURN_REQUESTED':
      return 'warning';
    case 'DRAFT':
      return 'neutral';
    default:
      // In-production / in-transit states.
      return 'info';
  }
}
