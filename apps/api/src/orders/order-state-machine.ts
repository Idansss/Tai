import { OrderStatus } from '@tms/database';

/**
 * The canonical order lifecycle. TMS-B4-003 exercises only the checkout-and-payment portion
 * (AWAITING_PAYMENT → PAYMENT_PROCESSING → PAID, and the PAYMENT_FAILED / PAYMENT_CANCELLED /
 * CANCELLED branches). The production, dispatch, and returns transitions are declared here so the
 * later operations tasks drive the same audited machine rather than inventing a second one.
 *
 * A status maps to the set of statuses it may move to. An empty set is terminal.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [OrderStatus.DRAFT]: [OrderStatus.AWAITING_PAYMENT, OrderStatus.CANCELLED],
  [OrderStatus.AWAITING_PAYMENT]: [
    OrderStatus.PAYMENT_PROCESSING,
    OrderStatus.PAID,
    OrderStatus.PAYMENT_FAILED,
    OrderStatus.PAYMENT_CANCELLED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PAYMENT_PROCESSING]: [
    OrderStatus.PAID,
    OrderStatus.PAYMENT_FAILED,
    OrderStatus.PAYMENT_CANCELLED,
  ],
  [OrderStatus.PAID]: [
    OrderStatus.PRODUCTION_QUEUED,
    OrderStatus.CANCEL_REQUESTED,
    OrderStatus.REFUND_PENDING,
  ],
  [OrderStatus.PRODUCTION_QUEUED]: [OrderStatus.PRINTING, OrderStatus.CANCEL_REQUESTED],
  [OrderStatus.PRINTING]: [OrderStatus.QUALITY_CHECK],
  [OrderStatus.QUALITY_CHECK]: [OrderStatus.READY_FOR_DISPATCH, OrderStatus.PRINTING],
  [OrderStatus.READY_FOR_DISPATCH]: [OrderStatus.SHIPMENT_BOOKED],
  [OrderStatus.SHIPMENT_BOOKED]: [OrderStatus.SHIPPED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.DELIVERY_EXCEPTION],
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED, OrderStatus.RETURN_REQUESTED],
  [OrderStatus.COMPLETED]: [OrderStatus.RETURN_REQUESTED],
  // A failed payment can be retried; a cancelled payment is terminal.
  [OrderStatus.PAYMENT_FAILED]: [OrderStatus.AWAITING_PAYMENT, OrderStatus.CANCELLED],
  [OrderStatus.PAYMENT_CANCELLED]: [],
  [OrderStatus.CANCEL_REQUESTED]: [OrderStatus.CANCELLED, OrderStatus.REFUND_PENDING],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUND_PENDING]: [OrderStatus.REFUNDED, OrderStatus.PARTIALLY_REFUNDED],
  [OrderStatus.PARTIALLY_REFUNDED]: [OrderStatus.REFUNDED],
  [OrderStatus.REFUNDED]: [],
  [OrderStatus.DELIVERY_EXCEPTION]: [
    OrderStatus.SHIPPED,
    OrderStatus.RETURN_REQUESTED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.RETURN_REQUESTED]: [OrderStatus.RETURN_APPROVED, OrderStatus.CANCELLED],
  [OrderStatus.RETURN_APPROVED]: [OrderStatus.RETURN_IN_TRANSIT],
  [OrderStatus.RETURN_IN_TRANSIT]: [OrderStatus.RETURNED],
  [OrderStatus.RETURNED]: [OrderStatus.REFUND_PENDING],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return (ORDER_TRANSITIONS[from] ?? []).includes(to);
}
