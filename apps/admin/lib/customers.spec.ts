import { describe, expect, it } from 'vitest';
import {
  type CustomerOrderInput,
  customerId,
  customerStatus,
  deriveCustomerProfile,
  deriveCustomers,
  filterCustomers,
} from './customers';

function order(over: Partial<CustomerOrderInput>): CustomerOrderInput {
  return {
    reference: 'TMS-AAA111',
    customerName: 'Ada Verify',
    customerEmail: 'ada@example.com',
    phone: '08031234567',
    city: 'Lagos',
    state: 'Lagos',
    placedAt: '2026-07-15T09:00:00.000Z',
    status: 'PAID',
    paid: true,
    itemCount: 1,
    totalMinor: 1_500_000,
    currency: 'NGN',
    ...over,
  };
}

const now = new Date('2026-07-15T12:00:00.000Z');

describe('customerId', () => {
  it('normalises the email', () => {
    expect(customerId('  Ada@Example.com ')).toBe('ada@example.com');
  });
});

describe('customerStatus', () => {
  it('classifies new / active / dormant', () => {
    expect(customerStatus(1, '2026-07-14T00:00:00.000Z', now)).toBe('new');
    expect(customerStatus(3, '2026-07-10T00:00:00.000Z', now)).toBe('active');
    expect(customerStatus(5, '2026-01-01T00:00:00.000Z', now)).toBe('dormant');
  });
});

describe('deriveCustomers', () => {
  const orders = [
    order({
      reference: 'O1',
      customerEmail: 'ada@example.com',
      placedAt: '2026-07-10T00:00:00.000Z',
      totalMinor: 1_000_000,
      paid: true,
    }),
    order({
      reference: 'O2',
      customerEmail: 'ada@example.com',
      placedAt: '2026-07-14T00:00:00.000Z',
      totalMinor: 2_000_000,
      paid: true,
      customerName: 'Ada V.',
    }),
    order({
      reference: 'O3',
      customerEmail: 'bola@example.com',
      placedAt: '2026-07-12T00:00:00.000Z',
      totalMinor: 3_000_000,
      paid: false,
    }),
  ];
  it('groups by email and sums only paid spend', () => {
    const customers = deriveCustomers(orders, now);
    const ada = customers.find((c) => c.id === 'ada@example.com');
    expect(ada?.orderCount).toBe(2);
    expect(ada?.totalSpentMinor).toBe(3_000_000);
    expect(ada?.name).toBe('Ada V.'); // from the most recent order
    const bola = customers.find((c) => c.id === 'bola@example.com');
    expect(bola?.totalSpentMinor).toBe(0); // unpaid order does not count
  });
  it('sorts by most recent order first', () => {
    const customers = deriveCustomers(orders, now);
    expect(customers[0]?.id).toBe('ada@example.com'); // 07-14 latest
  });
});

describe('deriveCustomerProfile', () => {
  const orders = [
    order({
      reference: 'O1',
      customerEmail: 'ada@example.com',
      placedAt: '2026-07-10T00:00:00.000Z',
    }),
    order({
      reference: 'O2',
      customerEmail: 'ada@example.com',
      placedAt: '2026-07-14T00:00:00.000Z',
    }),
  ];
  it('returns a profile with the order history newest first', () => {
    const p = deriveCustomerProfile(orders, 'ADA@example.com', now);
    expect(p).not.toBeNull();
    expect(p?.orders.map((o) => o.reference)).toEqual(['O2', 'O1']);
    expect(p?.orderCount).toBe(2);
  });
  it('returns null for an unknown customer', () => {
    expect(deriveCustomerProfile(orders, 'nobody@example.com', now)).toBeNull();
  });
});

describe('filterCustomers', () => {
  const customers = deriveCustomers(
    [
      order({
        customerEmail: 'ada@example.com',
        customerName: 'Ada Verify',
        placedAt: '2026-07-14T00:00:00.000Z',
      }),
      order({
        customerEmail: 'bola@example.com',
        customerName: 'Bola Okoro',
        placedAt: '2026-01-01T00:00:00.000Z',
      }),
    ],
    now,
  );
  it('filters by status', () => {
    expect(filterCustomers(customers, { status: 'dormant' }).map((c) => c.email)).toEqual([
      'bola@example.com',
    ]);
  });
  it('searches name and email', () => {
    expect(filterCustomers(customers, { query: 'bola' }).map((c) => c.email)).toEqual([
      'bola@example.com',
    ]);
  });
});
