import { describe, expect, it } from 'vitest';
import { formatOrderStatus, orderStatusTone } from './order-status';

describe('formatOrderStatus', () => {
  it('title-cases the enum without underscores', () => {
    expect(formatOrderStatus('READY_FOR_DISPATCH')).toBe('Ready for dispatch');
    expect(formatOrderStatus('PAID')).toBe('Paid');
    expect(formatOrderStatus('PAYMENT_FAILED')).toBe('Payment failed');
  });
});

describe('orderStatusTone', () => {
  it('maps lifecycle groups to tones', () => {
    expect(orderStatusTone('PAID')).toBe('success');
    expect(orderStatusTone('DELIVERED')).toBe('success');
    expect(orderStatusTone('PAYMENT_FAILED')).toBe('error');
    expect(orderStatusTone('DELIVERY_EXCEPTION')).toBe('error');
    expect(orderStatusTone('AWAITING_PAYMENT')).toBe('warning');
    expect(orderStatusTone('PRINTING')).toBe('info');
    expect(orderStatusTone('DRAFT')).toBe('neutral');
  });
});
