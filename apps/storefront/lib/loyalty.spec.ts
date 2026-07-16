import { describe, expect, it } from 'vitest';
import type { LoyaltyReward } from './data/types';
import {
  canRedeem,
  nextTier,
  pointsToNextTier,
  referralUrl,
  tierForPoints,
  tierProgressPercent,
} from './loyalty';

describe('tierForPoints', () => {
  it('maps balances to the right tier band', () => {
    expect(tierForPoints(0).id).toBe('bronze');
    expect(tierForPoints(499).id).toBe('bronze');
    expect(tierForPoints(500).id).toBe('silver');
    expect(tierForPoints(1499).id).toBe('silver');
    expect(tierForPoints(1500).id).toBe('gold');
    expect(tierForPoints(9999).id).toBe('gold');
  });
});

describe('nextTier / pointsToNextTier', () => {
  it('points to the next tier and the gap', () => {
    expect(nextTier(0)?.id).toBe('silver');
    expect(pointsToNextTier(300)).toBe(200);
    expect(nextTier(600)?.id).toBe('gold');
    expect(pointsToNextTier(600)).toBe(900);
  });

  it('has no next tier at the top', () => {
    expect(nextTier(1500)).toBeNull();
    expect(pointsToNextTier(2000)).toBeNull();
  });
});

describe('tierProgressPercent', () => {
  it('measures progress within the current band', () => {
    expect(tierProgressPercent(0)).toBe(0);
    expect(tierProgressPercent(250)).toBe(50); // halfway bronze→silver (0–500)
    expect(tierProgressPercent(1000)).toBe(50); // halfway silver→gold (500–1500)
  });

  it('is 100 at the top tier', () => {
    expect(tierProgressPercent(1500)).toBe(100);
    expect(tierProgressPercent(5000)).toBe(100);
  });
});

describe('referralUrl', () => {
  it('builds an absolute register link with the code', () => {
    expect(referralUrl('TAI-ABC123', 'https://tai.example')).toBe(
      'https://tai.example/register?ref=TAI-ABC123',
    );
  });

  it('trims a trailing slash on the origin', () => {
    expect(referralUrl('X', 'https://tai.example/')).toBe('https://tai.example/register?ref=X');
  });
});

describe('canRedeem', () => {
  const reward: LoyaltyReward = {
    id: 'r1',
    name: '₦2,000 off',
    description: 'Money off your next order.',
    pointsCost: 400,
  };

  it('needs enough points', () => {
    expect(canRedeem(reward, 400)).toBe(true);
    expect(canRedeem(reward, 399)).toBe(false);
  });
});
