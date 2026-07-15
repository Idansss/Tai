import { describe, expect, it } from 'vitest';
import type { Review } from './data/types';
import {
  distributionPercents,
  formatAverage,
  summariseReviews,
  validateReviewInput,
} from './reviews';

function review(rating: number, overrides: Partial<Review> = {}): Review {
  return {
    id: `r-${Math.random()}`,
    rating,
    title: 'A title',
    body: 'A long enough body for a review.',
    author: 'Ada',
    createdAt: '2026-06-01T00:00:00.000Z',
    verifiedPurchase: false,
    ...overrides,
  };
}

describe('summariseReviews', () => {
  it('returns a zeroed summary for no reviews', () => {
    const stats = summariseReviews([]);
    expect(stats.count).toBe(0);
    expect(stats.average).toBe(0);
    expect(stats.distribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  });

  it('averages and distributes ratings', () => {
    const stats = summariseReviews([review(5), review(4), review(3), review(5)]);
    expect(stats.count).toBe(4);
    expect(stats.average).toBeCloseTo(4.25);
    expect(stats.distribution).toEqual({ 1: 0, 2: 0, 3: 1, 4: 1, 5: 2 });
  });

  it('clamps and rounds out-of-range ratings into 1–5', () => {
    const stats = summariseReviews([review(0), review(6), review(4.4)]);
    expect(stats.distribution[1]).toBe(1); // 0 → 1
    expect(stats.distribution[5]).toBe(1); // 6 → 5
    expect(stats.distribution[4]).toBe(1); // 4.4 → 4
  });
});

describe('distributionPercents', () => {
  it('is all zero when there are no reviews', () => {
    expect(distributionPercents(summariseReviews([]))).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  });

  it('computes rounded percentages per star', () => {
    const stats = summariseReviews([review(5), review(5), review(3), review(1)]);
    const pct = distributionPercents(stats);
    expect(pct[5]).toBe(50);
    expect(pct[3]).toBe(25);
    expect(pct[1]).toBe(25);
    expect(pct[4]).toBe(0);
  });
});

describe('formatAverage', () => {
  it('shows one decimal place', () => {
    expect(formatAverage(4.25)).toBe('4.3');
    expect(formatAverage(5)).toBe('5.0');
    expect(formatAverage(0)).toBe('0.0');
  });
});

describe('validateReviewInput', () => {
  const valid = {
    rating: 5,
    title: 'Great tee',
    body: 'Really love the print quality.',
    author: 'Ada',
  };

  it('accepts a complete submission', () => {
    expect(validateReviewInput(valid)).toEqual({ ok: true });
  });

  it('rejects an out-of-range rating', () => {
    const result = validateReviewInput({ ...valid, rating: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.rating).toBeTruthy();
  });

  it('rejects a too-short title and body and a blank author', () => {
    const result = validateReviewInput({ rating: 4, title: 'x', body: 'short', author: '  ' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.title).toBeTruthy();
      expect(result.errors.body).toBeTruthy();
      expect(result.errors.author).toBeTruthy();
    }
  });
});
