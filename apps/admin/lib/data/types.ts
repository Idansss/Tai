import type { OrderStatus, PaymentStatus, ShippingStatus } from '@tms/contracts';

/**
 * Admin view models. These are the operational shapes the mock adapter produces
 * today and the API adapter will map real admin read endpoints into once Codex
 * publishes them (see docs/coordination/FRONTEND_TO_BACKEND.md). Shared enums
 * (order/payment/shipping status) come from @tms/contracts so the mock and the
 * real backend speak the same language.
 *
 * The admin platform has **no backend yet** — every screen runs on the typed
 * mock adapter and is recorded in FRONTEND_HANDOFF.md until it is swapped.
 */

/** A headline metric for the dashboard, with an optional delta vs. prior period. */
export interface DashboardMetric {
  id: string;
  label: string;
  /** Preformatted display value (currency/number already rendered). */
  value: string;
  /** Optional supporting caption, e.g. "30 days" or "vs. last week". */
  caption?: string;
  /** Optional trend for the caption chip. */
  trend?: { direction: 'up' | 'down' | 'flat'; label: string };
  /** Draws attention (e.g. failed payments, delivery exceptions) when > 0. */
  tone?: 'default' | 'warning' | 'danger';
}

/** A live operational queue tile (production, QC, dispatch, exceptions…). */
export interface QueueTile {
  id: string;
  label: string;
  count: number;
  /** Route this tile deep-links into once the section exists. */
  href: string;
  tone?: 'default' | 'warning' | 'danger';
}

/** A ranked "best performing" list row. */
export interface RankedItem {
  id: string;
  label: string;
  /** Preformatted secondary value, e.g. "42 sold" or "₦1.2m". */
  value: string;
}

export interface RankedList {
  id: string;
  title: string;
  items: RankedItem[];
}

/** A recent order row for the dashboard's activity panel. */
export interface RecentOrderRow {
  reference: string;
  customerName: string;
  placedAt: string;
  status: OrderStatus;
  totalMinor: number;
  currency: string;
}

export interface DashboardData {
  metrics: DashboardMetric[];
  queues: QueueTile[];
  rankedLists: RankedList[];
  recentOrders: RecentOrderRow[];
  /** Count of unresolved entries in the error centre (integration failures). */
  openIssues: number;
}

// --- Orders (F4-002) -----------------------------------------------------------

export type PrintStatus = 'queued' | 'printing' | 'printed' | 'qc_passed' | 'reprint';

export interface AdminOrderItem {
  id: string;
  artworkTitle: string;
  garment: string;
  colour: string;
  size: string;
  placement?: string;
  quantity: number;
  unitPriceMinor: number;
  /** Production/print state for this line. */
  printStatus: PrintStatus;
}

export interface AdminOrderSummary {
  reference: string;
  customerName: string;
  customerEmail: string;
  placedAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  itemCount: number;
  totalMinor: number;
  currency: string;
}

export interface AdminCustomerDetail {
  name: string;
  email: string;
  phone: string;
  /** Count of the customer's prior orders (for context). */
  previousOrders: number;
}

export interface AdminDeliveryAddress {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
}

export interface AdminPaymentDetail {
  method: 'card' | 'transfer';
  status: PaymentStatus;
  providerReference: string;
  paidAt?: string;
}

export interface AdminShipmentDetail {
  carrier: string;
  trackingNumber?: string;
  status: ShippingStatus;
  eta: string;
}

export interface AdminOrderDetail extends AdminOrderSummary {
  items: AdminOrderItem[];
  customer: AdminCustomerDetail;
  delivery: AdminDeliveryAddress;
  deliveryMethodLabel: string;
  payment: AdminPaymentDetail;
  shipment: AdminShipmentDetail;
  subtotalMinor: number;
  discountMinor: number;
  deliveryMinor: number;
  taxMinor: number;
}

export interface AdminOrderListParams {
  /** Free-text search over reference / customer name / email. */
  query?: string;
  /** Filter to a single order status, or all. */
  status?: OrderStatus | 'all';
  /** 1-based page number. */
  page?: number;
  pageSize?: number;
}

export interface AdminOrderListResult {
  items: AdminOrderSummary[];
  /** Total matching the filter (before pagination). */
  total: number;
  page: number;
  pageSize: number;
}

/** The admin data access surface. Extended per F4 task (artworks, garments, …). */
export interface AdminDataProvider {
  getDashboard(): Promise<DashboardData>;
  listOrders(params?: AdminOrderListParams): Promise<AdminOrderListResult>;
  getOrder(reference: string): Promise<AdminOrderDetail | null>;
}
