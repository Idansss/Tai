/**
 * Pure analytics helpers — bucket orders into a daily sales trend and an order
 * status breakdown, and scale values for the lightweight CSS bar charts.
 * Framework-free so it can be unit-tested and shared by the analytics view.
 */

import type { OrderStatus } from '@tms/contracts';
import type { AnalyticsBreakdownRow, AnalyticsPoint } from './data/types';
import { formatOrderStatus, orderStatusTone } from './order-status';

/** The narrow order shape the analytics need (an order maps onto this). */
export interface AnalyticsOrderInput {
  placedAt: string;
  status: OrderStatus;
  /** Whether payment succeeded (counts toward revenue). */
  paid: boolean;
  totalMinor: number;
}

/** The UTC calendar day (YYYY-MM-DD) an ISO timestamp falls on. */
export function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Daily orders + paid revenue over the `days`-day window ending on `endDate`
 * (inclusive), oldest first. Every day in the window is present (zero-filled).
 */
export function buildDailySeries(
  orders: AnalyticsOrderInput[],
  days: number,
  endDate: Date = new Date(),
): AnalyticsPoint[] {
  const end = new Date(
    Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()),
  );
  const points: AnalyticsPoint[] = [];
  const index = new Map<string, AnalyticsPoint>();

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(end.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    const point: AnalyticsPoint = { date: key, orders: 0, revenueMinor: 0 };
    points.push(point);
    index.set(key, point);
  }

  for (const o of orders) {
    const point = index.get(dayKey(o.placedAt));
    if (!point) continue;
    point.orders += 1;
    if (o.paid) point.revenueMinor += o.totalMinor;
  }

  return points;
}

/** Order-status distribution, most common first, with a display tone. */
export function statusBreakdown(orders: AnalyticsOrderInput[]): AnalyticsBreakdownRow[] {
  const counts = new Map<OrderStatus, number>();
  for (const o of orders) {
    counts.set(o.status, (counts.get(o.status) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([status, value]) => ({
      label: formatOrderStatus(status),
      value,
      tone: orderStatusTone(status),
    }))
    .sort((a, b) => b.value - a.value);
}

/** The largest `orders` count in a series (for bar scaling); at least 1. */
export function maxOrders(points: AnalyticsPoint[]): number {
  return Math.max(1, ...points.map((p) => p.orders));
}

/** The largest `revenueMinor` in a series (for bar scaling); at least 1. */
export function maxRevenue(points: AnalyticsPoint[]): number {
  return Math.max(1, ...points.map((p) => p.revenueMinor));
}

/** A 0–100 bar width for `value` against `max` (clamped). */
export function barPercent(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}
