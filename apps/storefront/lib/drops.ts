import type { DropSummary } from './data/types';

/**
 * Pure domain logic for limited drops (TMS-F5-001). Everything here is a pure
 * function of the drop data + an explicit `now` (epoch ms), so status and
 * countdowns are deterministic and unit-testable. The UI passes `Date.now()`;
 * tests pass fixed clocks. The server owns the real timeline (TMS-FBR-008) -
 * the client never invents a "live"/"sold out" state.
 */

export type DropStatus = 'upcoming' | 'early_access' | 'live' | 'ended' | 'sold_out';

const parse = (iso: string | null): number | null => (iso === null ? null : Date.parse(iso));

/** Derive the drop status from its timestamps + sell-through, relative to `now`. */
export function dropStatus(drop: DropSummary, now: number): DropStatus {
  if (drop.soldOut) return 'sold_out';
  const release = Date.parse(drop.releaseAt);
  const early = parse(drop.earlyAccessAt);
  const ends = parse(drop.endsAt);
  if (ends !== null && now >= ends) return 'ended';
  if (now >= release) return 'live';
  if (early !== null && now >= early) return 'early_access';
  return 'upcoming';
}

export function dropStatusLabel(status: DropStatus): string {
  switch (status) {
    case 'upcoming':
      return 'Upcoming';
    case 'early_access':
      return 'Early access';
    case 'live':
      return 'Live now';
    case 'ended':
      return 'Closed';
    case 'sold_out':
      return 'Sold out';
  }
}

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'error' | 'info';

export function dropStatusTone(status: DropStatus): BadgeTone {
  switch (status) {
    case 'upcoming':
      return 'info';
    case 'early_access':
      return 'accent';
    case 'live':
      return 'success';
    case 'ended':
      return 'neutral';
    case 'sold_out':
      return 'warning';
  }
}

export interface DropMilestone {
  /** What the countdown is counting down to. */
  label: string;
  /** Target epoch ms, or null when nothing is pending (ended/sold out/open-ended live). */
  at: number | null;
}

/**
 * The next timeline event to count down to, given the current status.
 * - upcoming with an early window → early access opens
 * - upcoming with no early window (or after early opens) → the public release
 * - early_access → the public release
 * - live with an end → the drop closes
 * - live open-ended / ended / sold out → nothing pending (at: null)
 */
export function nextMilestone(drop: DropSummary, now: number): DropMilestone {
  const status = dropStatus(drop, now);
  const early = parse(drop.earlyAccessAt);
  const ends = parse(drop.endsAt);
  const release = Date.parse(drop.releaseAt);
  switch (status) {
    case 'upcoming':
      return early !== null && now < early
        ? { label: 'Early access opens', at: early }
        : { label: 'Drop opens', at: release };
    case 'early_access':
      return { label: 'Public release', at: release };
    case 'live':
      return ends !== null
        ? { label: 'Drop closes', at: ends }
        : { label: 'Available now', at: null };
    case 'ended':
    case 'sold_out':
      return { label: dropStatusLabel(status), at: null };
  }
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** Remaining milliseconds, floored at 0. */
  total: number;
}

const MS = { sec: 1000, min: 60_000, hour: 3_600_000, day: 86_400_000 } as const;

/** Break a positive remaining-ms span into day/hour/minute/second parts. */
export function countdownParts(remainingMs: number): CountdownParts {
  const total = Math.max(0, Math.floor(remainingMs));
  return {
    days: Math.floor(total / MS.day),
    hours: Math.floor((total % MS.day) / MS.hour),
    minutes: Math.floor((total % MS.hour) / MS.min),
    seconds: Math.floor((total % MS.min) / MS.sec),
    total,
  };
}

/** A spoken form of the remaining time, e.g. "2 days, 4 hours", for screen readers. */
export function countdownLabel(remainingMs: number): string {
  const { days, hours, minutes, seconds } = countdownParts(remainingMs);
  const units: [number, string][] = [
    [days, 'day'],
    [hours, 'hour'],
    [minutes, 'minute'],
    [seconds, 'second'],
  ];
  const parts = units
    .filter(([n]) => n > 0)
    .slice(0, 2)
    .map(([n, unit]) => `${n} ${unit}${n === 1 ? '' : 's'}`);
  return parts.length > 0 ? parts.join(', ') : 'less than a second';
}

const STATUS_ORDER: Record<DropStatus, number> = {
  live: 0,
  early_access: 1,
  upcoming: 2,
  sold_out: 3,
  ended: 4,
};

/**
 * Order drops for display: active (live → early access → upcoming) first, then
 * finished (sold out → ended). Within a group, the soonest next milestone wins;
 * drops with no pending milestone sort last within their group. Stable + pure.
 */
export function sortDrops(drops: DropSummary[], now: number): DropSummary[] {
  return drops
    .map((drop, index) => ({ drop, index }))
    .sort((a, b) => {
      const sa = dropStatus(a.drop, now);
      const sb = dropStatus(b.drop, now);
      if (STATUS_ORDER[sa] !== STATUS_ORDER[sb]) return STATUS_ORDER[sa] - STATUS_ORDER[sb];
      const ma = nextMilestone(a.drop, now).at;
      const mb = nextMilestone(b.drop, now).at;
      if (ma !== mb) {
        if (ma === null) return 1;
        if (mb === null) return -1;
        return ma - mb;
      }
      return a.index - b.index;
    })
    .map(({ drop }) => drop);
}
