import { describe, expect, it } from 'vitest';
import {
  type AnalyticsOrderInput,
  barPercent,
  buildDailySeries,
  dayKey,
  maxOrders,
  maxRevenue,
  statusBreakdown,
} from './analytics';

function order(over: Partial<AnalyticsOrderInput>): AnalyticsOrderInput {
  return {
    placedAt: '2026-07-15T09:00:00.000Z',
    status: 'PAID',
    paid: true,
    totalMinor: 1_000_000,
    ...over,
  };
}

describe('dayKey', () => {
  it('extracts the UTC calendar day', () => {
    expect(dayKey('2026-07-15T23:59:00.000Z')).toBe('2026-07-15');
  });
});

describe('buildDailySeries', () => {
  const end = new Date('2026-07-15T12:00:00.000Z');
  it('produces one zero-filled point per day, oldest first', () => {
    const series = buildDailySeries([], 3, end);
    expect(series.map((p) => p.date)).toEqual(['2026-07-13', '2026-07-14', '2026-07-15']);
    expect(series.every((p) => p.orders === 0 && p.revenueMinor === 0)).toBe(true);
  });
  it('buckets orders and counts revenue only for paid orders', () => {
    const series = buildDailySeries(
      [
        order({ placedAt: '2026-07-15T01:00:00.000Z', paid: true, totalMinor: 2_000_000 }),
        order({ placedAt: '2026-07-15T20:00:00.000Z', paid: false, totalMinor: 5_000_000 }),
        order({ placedAt: '2026-07-14T10:00:00.000Z', paid: true, totalMinor: 1_000_000 }),
      ],
      3,
      end,
    );
    const d15 = series.find((p) => p.date === '2026-07-15')!;
    expect(d15.orders).toBe(2);
    expect(d15.revenueMinor).toBe(2_000_000); // unpaid excluded
    const d14 = series.find((p) => p.date === '2026-07-14')!;
    expect(d14.orders).toBe(1);
  });
  it('ignores orders outside the window', () => {
    const series = buildDailySeries([order({ placedAt: '2026-06-01T00:00:00.000Z' })], 3, end);
    expect(series.reduce((n, p) => n + p.orders, 0)).toBe(0);
  });
});

describe('statusBreakdown', () => {
  it('counts by status, most common first', () => {
    const rows = statusBreakdown([
      order({ status: 'PAID' }),
      order({ status: 'PAID' }),
      order({ status: 'DELIVERED' }),
    ]);
    expect(rows[0]?.value).toBe(2);
    expect(rows[0]?.label).toBe('Paid');
    expect(rows).toHaveLength(2);
  });
});

describe('scaling helpers', () => {
  const points = [
    { date: 'a', orders: 2, revenueMinor: 500 },
    { date: 'b', orders: 5, revenueMinor: 1000 },
  ];
  it('finds maxima (at least 1)', () => {
    expect(maxOrders(points)).toBe(5);
    expect(maxRevenue(points)).toBe(1000);
    expect(maxOrders([])).toBe(1);
  });
  it('computes a clamped bar percent', () => {
    expect(barPercent(5, 10)).toBe(50);
    expect(barPercent(20, 10)).toBe(100);
    expect(barPercent(3, 0)).toBe(0);
  });
});
