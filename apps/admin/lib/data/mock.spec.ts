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

describe('mockAdminProvider.listGarments', () => {
  it('lists garments newest first', async () => {
    const list = await mockAdminProvider.listGarments();
    expect(list.length).toBeGreaterThan(0);
    const dates = list.map((g) => g.updatedAt);
    expect([...dates].sort((a, b) => b.localeCompare(a))).toEqual(dates);
  });

  it('filters by status and searches by name/template', async () => {
    const active = await mockAdminProvider.listGarments({ status: 'active' });
    expect(active.every((g) => g.status === 'active')).toBe(true);
    const byName = await mockAdminProvider.listGarments({ query: 'hoodie' });
    expect(byName.some((g) => g.name.toLowerCase().includes('hoodie'))).toBe(true);
  });

  it('summarises inventory (total + low stock) and counts only offered colours', async () => {
    const list = await mockAdminProvider.listGarments();
    for (const g of list) {
      expect(g.totalStock).toBeGreaterThanOrEqual(0);
      expect(g.lowStockCount).toBeGreaterThanOrEqual(0);
      expect(g.colourCount).toBeGreaterThan(0);
    }
  });
});

describe('mockAdminProvider.getGarment', () => {
  it('returns full detail for a known id', async () => {
    const g = await mockAdminProvider.getGarment('gm-classic-tee');
    expect(g).not.toBeNull();
    expect(g?.colours.length).toBeGreaterThan(0);
    expect(g?.sizes.length).toBeGreaterThan(0);
    // one variant per colour×size
    if (g) {
      expect(g.variants).toHaveLength(g.colours.length * g.sizes.length);
      expect(g.sizeChart.length).toBeGreaterThan(0);
      expect(g.printAreas.some((p) => p.view === 'front')).toBe(true);
    }
  });

  it('marks a discontinued colour as unavailable', async () => {
    const g = await mockAdminProvider.getGarment('gm-long-sleeve');
    expect(g?.colours.find((c) => c.id === 'bone')?.available).toBe(false);
  });

  it('returns null for an unknown id', async () => {
    expect(await mockAdminProvider.getGarment('gm-nope')).toBeNull();
  });
});

describe('mockAdminProvider.listProductionJobs', () => {
  it('derives active jobs from orders, oldest first, only on-board statuses', async () => {
    const jobs = await mockAdminProvider.listProductionJobs();
    expect(jobs.length).toBeGreaterThan(0);
    const times = jobs.map((j) => j.placedAt);
    expect([...times].sort((a, b) => a.localeCompare(b))).toEqual(times);
    const offBoard = ['AWAITING_PAYMENT', 'PAYMENT_FAILED', 'DELIVERED', 'COMPLETED', 'CANCELLED'];
    expect(jobs.every((j) => !offBoard.includes(j.status))).toBe(true);
    expect(jobs.every((j) => j.items.length > 0)).toBe(true);
  });

  it('filters by stage', async () => {
    const qc = await mockAdminProvider.listProductionJobs({ stage: 'quality_check' });
    expect(qc.every((j) => j.stage === 'quality_check')).toBe(true);
  });

  it('spans multiple stages across the dataset', async () => {
    const jobs = await mockAdminProvider.listProductionJobs();
    const stages = new Set(jobs.map((j) => j.stage));
    expect(stages.size).toBeGreaterThan(1);
  });
});

describe('mockAdminProvider.listErrors', () => {
  it('lists safe error entries (no stack traces / secrets) and filters', async () => {
    const all = await mockAdminProvider.listErrors();
    expect(all.length).toBeGreaterThan(0);
    for (const e of all) {
      expect(e.correlationId).toBeTruthy();
      expect(e.message).toBeTruthy();
      expect(e.message.toLowerCase()).not.toContain('stack');
      expect(e).not.toHaveProperty('stackTrace');
    }
    const open = await mockAdminProvider.listErrors({ resolution: 'open' });
    expect(open.every((e) => e.resolution === 'open')).toBe(true);
    const payment = await mockAdminProvider.listErrors({ source: 'payment' });
    expect(payment.every((e) => e.source === 'payment')).toBe(true);
  });
});

describe('mockAdminProvider customers', () => {
  it('derives customers from orders and filters', async () => {
    const list = await mockAdminProvider.listCustomers();
    expect(list.length).toBeGreaterThan(0);
    for (const c of list) {
      expect(c.email).toContain('@');
      expect(c.orderCount).toBeGreaterThan(0);
      expect(c.totalSpentMinor).toBeGreaterThanOrEqual(0);
    }
  });

  it('returns a profile with order history for a known customer, null otherwise', async () => {
    const list = await mockAdminProvider.listCustomers();
    const first = list[0]!;
    const profile = await mockAdminProvider.getCustomer(first.id);
    expect(profile).not.toBeNull();
    expect(profile?.orders.length).toBeGreaterThan(0);
    expect(await mockAdminProvider.getCustomer('nobody@nowhere.test')).toBeNull();
  });
});

describe('mockAdminProvider.getAnalytics', () => {
  it('returns KPIs, a daily series and a status breakdown', async () => {
    const a = await mockAdminProvider.getAnalytics();
    expect(a.kpis.length).toBeGreaterThan(0);
    expect(a.daily).toHaveLength(14);
    expect(a.statusBreakdown.length).toBeGreaterThan(0);
    expect(a.topArtwork.items.length).toBeGreaterThan(0);
    expect(a.daily.reduce((n, p) => n + p.orders, 0)).toBeGreaterThan(0);
  });
});
