import { OrderStatus } from '@tms/database';
import { describe, expect, it } from 'vitest';

import { deliveryOptionsFor, resolveDeliveryOption, taxMinorOf } from './delivery.js';
import { canTransition } from './order-state-machine.js';

describe('delivery pricing and tax', () => {
  it('prices Lagos as a cheaper zone than nationwide', () => {
    const lagos = deliveryOptionsFor('Lagos', 'NGN');
    const abuja = deliveryOptionsFor('Abuja', 'NGN');
    const lagosStandard = lagos.find((option) => option.id === 'STANDARD')!;
    const abujaStandard = abuja.find((option) => option.id === 'STANDARD')!;
    expect(lagosStandard.price.amountMinor).toBe(150_000);
    expect(abujaStandard.price.amountMinor).toBe(350_000);
    expect(lagosStandard.price.amountMinor).toBeLessThan(abujaStandard.price.amountMinor);
  });

  it('matches the state casing insensitively', () => {
    expect(resolveDeliveryOption('EXPRESS', 'lagos', 'NGN').price.amountMinor).toBe(300_000);
    expect(resolveDeliveryOption('EXPRESS', 'LAGOS', 'NGN').price.amountMinor).toBe(300_000);
  });

  it('computes VAT by integer arithmetic and rounds to the nearest kobo', () => {
    expect(taxMinorOf(2_800_000)).toBe(210_000); // exactly 7.5%
    expect(taxMinorOf(1_333_333)).toBe(Math.round((1_333_333 * 75) / 1000));
    expect(Number.isInteger(taxMinorOf(999))).toBe(true);
  });
});

describe('order state machine', () => {
  it('allows the checkout-and-payment path and rejects illegal jumps', () => {
    expect(canTransition(OrderStatus.AWAITING_PAYMENT, OrderStatus.PAID)).toBe(true);
    expect(canTransition(OrderStatus.AWAITING_PAYMENT, OrderStatus.PAYMENT_FAILED)).toBe(true);
    expect(canTransition(OrderStatus.PAID, OrderStatus.PRODUCTION_QUEUED)).toBe(true);
    // A paid order cannot be paid again, and it cannot skip straight to delivered.
    expect(canTransition(OrderStatus.PAID, OrderStatus.PAID)).toBe(false);
    expect(canTransition(OrderStatus.AWAITING_PAYMENT, OrderStatus.DELIVERED)).toBe(false);
  });

  it('treats fully-settled states as terminal', () => {
    expect(canTransition(OrderStatus.CANCELLED, OrderStatus.PAID)).toBe(false);
    expect(canTransition(OrderStatus.REFUNDED, OrderStatus.PAID)).toBe(false);
    expect(canTransition(OrderStatus.PAYMENT_CANCELLED, OrderStatus.AWAITING_PAYMENT)).toBe(false);
  });
});
