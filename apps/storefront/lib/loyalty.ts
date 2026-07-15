import type { LoyaltyReward } from './data/types';

/**
 * Pure domain logic for loyalty & referrals (TMS-F5-010). The tier ladder and
 * the progress toward the next tier are derived here from a point balance, so
 * the account display and any future API agree on one definition. Referral URL
 * construction and redemption eligibility live here too. All illustrative — the
 * real ledger, tiers, and referral attribution are server-side (TMS-FBR-008).
 */

export type LoyaltyTier = 'bronze' | 'silver' | 'gold';

export interface TierDef {
  id: LoyaltyTier;
  label: string;
  /** Minimum lifetime points to reach this tier. */
  threshold: number;
}

export const TIERS: TierDef[] = [
  { id: 'bronze', label: 'Bronze', threshold: 0 },
  { id: 'silver', label: 'Silver', threshold: 500 },
  { id: 'gold', label: 'Gold', threshold: 1500 },
];

/** The tier a balance currently sits in (highest threshold not exceeding points). */
export function tierForPoints(points: number): TierDef {
  let current = TIERS[0]!;
  for (const tier of TIERS) {
    if (points >= tier.threshold) current = tier;
  }
  return current;
}

/** The next tier up, or null at the top tier. */
export function nextTier(points: number): TierDef | null {
  return TIERS.find((tier) => tier.threshold > points) ?? null;
}

/** Points needed to reach the next tier, or null at the top tier. */
export function pointsToNextTier(points: number): number | null {
  const next = nextTier(points);
  return next ? Math.max(0, next.threshold - points) : null;
}

/**
 * Progress (0–100) through the current tier band toward the next tier. Returns
 * 100 at the top tier.
 */
export function tierProgressPercent(points: number): number {
  const current = tierForPoints(points);
  const next = nextTier(points);
  if (!next) return 100;
  const span = next.threshold - current.threshold;
  if (span <= 0) return 100;
  return Math.round(((points - current.threshold) / span) * 100);
}

/** Absolute referral URL for a code, given the current origin. */
export function referralUrl(code: string, origin: string): string {
  const base = origin.replace(/\/$/, '');
  return `${base}/register?ref=${encodeURIComponent(code)}`;
}

/** Whether a reward can be redeemed with the current balance. */
export function canRedeem(reward: LoyaltyReward, points: number): boolean {
  return points >= reward.pointsCost;
}
