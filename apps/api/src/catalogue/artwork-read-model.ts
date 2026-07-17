import type { AvailabilityState, Money } from '@tms/contracts';

/** A drop window as loaded for an artwork read. */
export interface DropWindow {
  startsAt: Date | null;
  endsAt: Date | null;
}

/** An approved compatibility's price, as loaded for an artwork read. */
export interface ApprovedPrice {
  unitPriceMinor: number | null;
  currency: string | null;
}

/**
 * Catalogue-level availability for an artwork card, derived only from its published drop windows.
 * This mirrors `GarmentService.resolveAvailability` so the gallery badge agrees with what
 * `garment-configurations/validate` reports. Stock is deliberately not considered — it is not
 * public — so `AVAILABLE` means "the catalogue permits this sale", never "a unit is in stock".
 * Answers TMS-FBR-012.
 */
export function deriveArtworkAvailability(drops: DropWindow[], now: Date): AvailabilityState {
  // An artwork outside every drop sells normally; drops restrict, they do not gate.
  if (!drops.length) return 'AVAILABLE';
  const open = drops.some(
    (drop) => (!drop.startsAt || drop.startsAt <= now) && (!drop.endsAt || drop.endsAt > now),
  );
  if (open) return 'AVAILABLE';
  const upcoming = drops.some((drop) => drop.startsAt && drop.startsAt > now);
  if (upcoming) return 'DROP_NOT_OPEN';
  return 'DROP_ENDED';
}

/**
 * The lowest approved price across an artwork version's approved garment pairs, or `null` when
 * none exists. Money is integer minor units (ADR-015); floating point is never used. Answers
 * TMS-FBR-011.
 */
export function deriveStartingPrice(prices: ApprovedPrice[]): Money | null {
  let best: Money | null = null;
  for (const price of prices) {
    if (price.unitPriceMinor === null || price.currency === null) continue;
    if (best === null || price.unitPriceMinor < best.amountMinor) {
      best = { amountMinor: price.unitPriceMinor, currency: price.currency };
    }
  }
  return best;
}
