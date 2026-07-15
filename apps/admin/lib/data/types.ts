import type { OrderStatus } from '@tms/contracts';

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

/** The admin data access surface. Extended per F4 task (orders, artworks, …). */
export interface AdminDataProvider {
  getDashboard(): Promise<DashboardData>;
}
