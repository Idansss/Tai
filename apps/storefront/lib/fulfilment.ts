import type { DropStatus } from './drops';

/**
 * Made-to-order lead-time + pre-order estimates (TMS-F5-003). Every piece is
 * printed to order, so the "ships by" estimate is production (working days) then
 * courier. These are pure functions of an explicit `now` (epoch ms) so they are
 * deterministic and unit-testable; the real timeline is server-authoritative
 * once the fulfilment API lands (TMS-FBR-008 / spec "server is authoritative for
 * … shipping"). Working-day maths runs in UTC to stay timezone-independent.
 */

/** Production lead time in working days (printing + finishing), before courier. */
export const PRODUCTION_LEAD = { minDays: 2, maxDays: 4 } as const;

/** Advance `days` working days (Mon–Fri, skipping weekends) from `fromMs`. */
export function addWorkingDays(fromMs: number, days: number): number {
  const d = new Date(fromMs);
  let added = 0;
  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    const weekday = d.getUTCDay();
    if (weekday !== 0 && weekday !== 6) added += 1;
  }
  return d.getTime();
}

export interface ShipWindow {
  /** Earliest ship date (epoch ms) — production min. */
  earliestMs: number;
  /** Latest ship date (epoch ms) — production max. */
  latestMs: number;
}

/** The made-to-order ship window for an order placed at `now`. */
export function madeToOrderWindow(
  now: number,
  lead: { minDays: number; maxDays: number } = PRODUCTION_LEAD,
): ShipWindow {
  return {
    earliestMs: addWorkingDays(now, lead.minDays),
    latestMs: addWorkingDays(now, lead.maxDays),
  };
}

/**
 * The pre-order ship window: production starts when the drop opens (its
 * `releaseMs`), or now if the drop is already open. Used for upcoming /
 * early-access drops that can be reserved before the public release.
 */
export function preOrderWindow(
  releaseMs: number,
  now: number,
  lead: { minDays: number; maxDays: number } = PRODUCTION_LEAD,
): ShipWindow {
  return madeToOrderWindow(Math.max(now, releaseMs), lead);
}

/** A drop is pre-orderable while it is upcoming or in the early-access window. */
export function isPreOrderStatus(status: DropStatus): boolean {
  return status === 'upcoming' || status === 'early_access';
}

/** Concise, clock-free made-to-order summary for a persistent notice. */
export function madeToOrderSummary(lead = PRODUCTION_LEAD): string {
  return `Made to order — printed and finished in ${lead.minDays}–${lead.maxDays} working days, then shipped.`;
}
