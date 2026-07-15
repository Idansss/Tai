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
});
