import { describe, expect, it } from 'vitest';
import { mockAdminProvider } from './mock';

describe('mockAdminProvider.getDashboard', () => {
  it('returns metrics, queues, ranked lists and recent orders', async () => {
    const data = await mockAdminProvider.getDashboard();
    expect(data.metrics.length).toBeGreaterThan(0);
    expect(data.queues.length).toBeGreaterThan(0);
    expect(data.rankedLists.length).toBeGreaterThan(0);
    expect(data.recentOrders.length).toBeGreaterThan(0);
  });

  it('gives every metric an id, label and preformatted value', async () => {
    const { metrics } = await mockAdminProvider.getDashboard();
    for (const m of metrics) {
      expect(m.id).toBeTruthy();
      expect(m.label).toBeTruthy();
      expect(m.value).toBeTruthy();
    }
  });

  it('exposes named operational queues with non-negative counts', async () => {
    const { queues } = await mockAdminProvider.getDashboard();
    for (const q of queues) {
      expect(q.count).toBeGreaterThanOrEqual(0);
      expect(q.href.startsWith('/')).toBe(true);
    }
  });

  it('tags recent orders with a contract OrderStatus', async () => {
    const { recentOrders } = await mockAdminProvider.getDashboard();
    const seen = recentOrders.map((o) => o.status);
    expect(seen).toContain('PAID');
    // references are the human, unambiguous format used across the app
    for (const o of recentOrders) {
      expect(o.reference.startsWith('TMS-')).toBe(true);
    }
  });

  it('every recent order resolves to a real order detail', async () => {
    const { recentOrders } = await mockAdminProvider.getDashboard();
    for (const row of recentOrders) {
      const detail = await mockAdminProvider.getOrder(row.reference);
      expect(detail).not.toBeNull();
      expect(detail?.totalMinor).toBe(row.totalMinor);
    }
  });
});

describe('mockAdminProvider.listOrders', () => {
  it('paginates the dataset', async () => {
    const first = await mockAdminProvider.listOrders({ page: 1, pageSize: 10 });
    expect(first.items).toHaveLength(10);
    expect(first.total).toBeGreaterThan(10);
    expect(first.page).toBe(1);
    // newest first
    const dates = first.items.map((o) => o.placedAt);
    expect([...dates].sort((a, b) => b.localeCompare(a))).toEqual(dates);
  });

  it('filters by status', async () => {
    const res = await mockAdminProvider.listOrders({ status: 'PAID', pageSize: 100 });
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items.every((o) => o.status === 'PAID')).toBe(true);
  });

  it('searches by reference and customer', async () => {
    const byRef = await mockAdminProvider.listOrders({ query: 'TMS-5HWEUR' });
    expect(byRef.items.map((o) => o.reference)).toContain('TMS-5HWEUR');
    const byName = await mockAdminProvider.listOrders({ query: 'ada', pageSize: 100 });
    expect(byName.items.some((o) => o.customerName.toLowerCase().includes('ada'))).toBe(true);
  });
});

describe('mockAdminProvider.getOrder', () => {
  it('returns full detail for a known reference', async () => {
    const order = await mockAdminProvider.getOrder('TMS-5HWEUR');
    expect(order).not.toBeNull();
    expect(order?.items.length).toBeGreaterThan(0);
    expect(order?.payment.providerReference).toBeTruthy();
    // totals add up: subtotal - discount + delivery + tax = total
    if (order) {
      expect(order.subtotalMinor - order.discountMinor + order.deliveryMinor + order.taxMinor).toBe(
        order.totalMinor,
      );
    }
  });

  it('returns null for an unknown reference', async () => {
    expect(await mockAdminProvider.getOrder('TMS-NOPE00')).toBeNull();
  });
});
