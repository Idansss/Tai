import type { OrderStatus } from '@tms/contracts';
import { describe, expect, it } from 'vitest';
import { friendlyOrderStatus, orderTracking } from './order-status';

describe('friendlyOrderStatus', () => {
  it('maps raw statuses to human labels (never the raw code)', () => {
    expect(friendlyOrderStatus('PAID')).toBe('Order confirmed');
    expect(friendlyOrderStatus('PRODUCTION_QUEUED')).toBe('Preparing your piece');
    expect(friendlyOrderStatus('SHIPPED')).toBe('In transit');
    expect(friendlyOrderStatus('DELIVERY_EXCEPTION')).toBe('Delivery needs attention');
  });

  it('never returns a string containing an underscore (raw code leak)', () => {
    const all: OrderStatus[] = [
      'DRAFT',
      'AWAITING_PAYMENT',
      'PAYMENT_PROCESSING',
      'PAID',
      'PRODUCTION_QUEUED',
      'PRINTING',
      'QUALITY_CHECK',
      'READY_FOR_DISPATCH',
      'SHIPMENT_BOOKED',
      'SHIPPED',
      'DELIVERED',
      'COMPLETED',
      'PAYMENT_FAILED',
      'PAYMENT_CANCELLED',
      'CANCEL_REQUESTED',
      'CANCELLED',
      'REFUND_PENDING',
      'PARTIALLY_REFUNDED',
      'REFUNDED',
      'DELIVERY_EXCEPTION',
      'RETURN_REQUESTED',
      'RETURN_APPROVED',
      'RETURN_IN_TRANSIT',
      'RETURNED',
    ];
    for (const s of all) {
      expect(friendlyOrderStatus(s)).not.toMatch(/_/);
    }
  });
});

describe('orderTracking', () => {
  it('shows no production timeline before payment is confirmed', () => {
    const t = orderTracking('AWAITING_PAYMENT');
    expect(t.steps).toHaveLength(0);
    expect(t.tone).toBe('info');
  });

  it('marks a failed payment as an error with no timeline', () => {
    const t = orderTracking('PAYMENT_FAILED');
    expect(t.steps).toHaveLength(0);
    expect(t.tone).toBe('error');
  });

  it('marks the first step current when the order is just paid', () => {
    const t = orderTracking('PAID');
    expect(t.steps[0]).toEqual({ label: 'Order confirmed', state: 'current' });
    expect(t.steps.slice(1).every((s) => s.state === 'upcoming')).toBe(true);
    expect(t.tone).toBe('success');
  });

  it('marks earlier steps done and the reached step current mid-production', () => {
    const t = orderTracking('PRINTING');
    const labels = t.steps.map((s) => `${s.label}:${s.state}`);
    expect(labels).toContain('Order confirmed:done');
    expect(labels).toContain('Preparing your piece:done');
    expect(labels).toContain('Printing:current');
    expect(labels).toContain('Quality check:upcoming');
  });

  it('marks every step done when delivered', () => {
    const t = orderTracking('DELIVERED');
    expect(t.steps.every((s) => s.state === 'done')).toBe(true);
    expect(t.headline).toBe('Delivered');
    expect(t.tone).toBe('success');
  });

  it('flags a delivery exception as a warning while keeping the timeline', () => {
    const t = orderTracking('DELIVERY_EXCEPTION');
    expect(t.tone).toBe('warning');
    expect(t.steps.length).toBeGreaterThan(0);
  });
});
