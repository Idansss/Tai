import { describe, expect, it } from 'vitest';
import { outcomeToStatuses, parseOutcome, shouldClearCart } from './payment';

describe('parseOutcome', () => {
  it('accepts the three known outcomes case-insensitively', () => {
    expect(parseOutcome('success')).toBe('success');
    expect(parseOutcome('PENDING')).toBe('pending');
    expect(parseOutcome(' failure ')).toBe('failure');
  });

  it('defaults to success for missing or unknown values', () => {
    expect(parseOutcome(null)).toBe('success');
    expect(parseOutcome(undefined)).toBe('success');
    expect(parseOutcome('boom')).toBe('success');
  });
});

describe('outcomeToStatuses', () => {
  it('maps each outcome to order + payment statuses', () => {
    expect(outcomeToStatuses('success')).toEqual({ order: 'PAID', payment: 'SUCCEEDED' });
    expect(outcomeToStatuses('pending')).toEqual({
      order: 'PAYMENT_PROCESSING',
      payment: 'PENDING',
    });
    expect(outcomeToStatuses('failure')).toEqual({ order: 'PAYMENT_FAILED', payment: 'FAILED' });
  });
});

describe('shouldClearCart', () => {
  it('clears the bag except on failure (kept for retry)', () => {
    expect(shouldClearCart('success')).toBe(true);
    expect(shouldClearCart('pending')).toBe(true);
    expect(shouldClearCart('failure')).toBe(false);
  });
});
