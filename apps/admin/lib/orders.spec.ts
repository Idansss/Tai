import { describe, expect, it } from 'vitest';
import type { AdminOrderSummary } from './data/types';
import { filterOrders, matchesQuery, orderTimeline, pageCount, paginate } from './orders';

function summary(over: Partial<AdminOrderSummary>): AdminOrderSummary {
  return {
    reference: 'TMS-AAAAAA',
    customerName: 'Ada Buyer',
    customerEmail: 'ada@example.com',
    placedAt: '2026-07-15T00:00:00.000Z',
    status: 'PAID',
    paymentStatus: 'SUCCEEDED',
    itemCount: 1,
    totalMinor: 1000000,
    currency: 'NGN',
    ...over,
  };
}

describe('matchesQuery', () => {
  const o = summary({
    reference: 'TMS-5HWEUR',
    customerName: 'Bola Okoro',
    customerEmail: 'b@x.com',
  });
  it('matches empty query', () => {
    expect(matchesQuery(o, '')).toBe(true);
    expect(matchesQuery(o, '  ')).toBe(true);
  });
  it('matches reference / name / email case-insensitively', () => {
    expect(matchesQuery(o, '5hweur')).toBe(true);
    expect(matchesQuery(o, 'bola')).toBe(true);
    expect(matchesQuery(o, 'B@X')).toBe(true);
    expect(matchesQuery(o, 'zzz')).toBe(false);
  });
});

describe('filterOrders', () => {
  const orders = [
    summary({ reference: 'TMS-1', status: 'PAID', customerName: 'Ada' }),
    summary({ reference: 'TMS-2', status: 'SHIPPED', customerName: 'Bola' }),
    summary({ reference: 'TMS-3', status: 'PAID', customerName: 'Chidi' }),
  ];
  it('filters by status', () => {
    expect(filterOrders(orders, { status: 'PAID' }).map((o) => o.reference)).toEqual([
      'TMS-1',
      'TMS-3',
    ]);
  });
  it('filters by query and status together', () => {
    expect(
      filterOrders(orders, { status: 'PAID', query: 'chidi' }).map((o) => o.reference),
    ).toEqual(['TMS-3']);
  });
  it('returns all with defaults', () => {
    expect(filterOrders(orders)).toHaveLength(3);
  });
});

describe('paginate', () => {
  const items = Array.from({ length: 25 }, (_, i) => i);
  it('slices a page', () => {
    const p = paginate(items, 2, 10);
    expect(p.items).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    expect(p.total).toBe(25);
    expect(p.page).toBe(2);
  });
  it('clamps out-of-range pages', () => {
    expect(paginate(items, 99, 10).page).toBe(3);
    expect(paginate(items, 0, 10).page).toBe(1);
    expect(paginate(items, -5, 10).page).toBe(1);
  });
  it('pageCount rounds up and is at least 1', () => {
    expect(pageCount(25, 10)).toBe(3);
    expect(pageCount(0, 10)).toBe(1);
  });
});

describe('orderTimeline', () => {
  it('builds the lifecycle up to the current status', () => {
    const t = orderTimeline('PRINTING');
    expect(t.map((e) => e.label)).toEqual(['Paid', 'Production queued', 'Printing']);
    expect(t.at(-1)).toMatchObject({ state: 'current' });
    expect(t.slice(0, -1).every((e) => e.state === 'done')).toBe(true);
  });

  it('marks paid as the first current step', () => {
    const t = orderTimeline('PAID');
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ label: 'Paid', state: 'current' });
  });

  it('returns a single event for off-happy-path statuses', () => {
    const t = orderTimeline('PAYMENT_FAILED');
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ label: 'Payment failed', state: 'current' });
  });

  it('uses formatted (readable) labels, not raw codes', () => {
    for (const e of orderTimeline('SHIPPED')) {
      expect(e.label).not.toMatch(/_/);
    }
  });
});
