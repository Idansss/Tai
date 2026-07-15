import { describe, expect, it } from 'vitest';
import {
  addWorkingDays,
  isPreOrderStatus,
  madeToOrderSummary,
  madeToOrderWindow,
  preOrderWindow,
  PRODUCTION_LEAD,
} from './fulfilment';

// 2026-01-01 is a Thursday (UTC).
const THU = Date.parse('2026-01-01T00:00:00.000Z');
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const DAY = 86_400_000;

describe('addWorkingDays', () => {
  it('advances within the same week', () => {
    expect(iso(addWorkingDays(THU, 1))).toBe('2026-01-02'); // Fri
  });

  it('skips the weekend', () => {
    expect(iso(addWorkingDays(THU, 2))).toBe('2026-01-05'); // Mon (skips Sat 3, Sun 4)
  });

  it('spans a full working week', () => {
    expect(iso(addWorkingDays(THU, 5))).toBe('2026-01-08'); // next Thu
  });

  it('returns the same instant for zero days', () => {
    expect(addWorkingDays(THU, 0)).toBe(THU);
  });

  it('never lands on a weekend', () => {
    for (let n = 1; n <= 10; n += 1) {
      const day = new Date(addWorkingDays(THU, n)).getUTCDay();
      expect(day).not.toBe(0);
      expect(day).not.toBe(6);
    }
  });
});

describe('madeToOrderWindow', () => {
  it('uses the production lead in working days', () => {
    const w = madeToOrderWindow(THU);
    expect(iso(w.earliestMs)).toBe('2026-01-05'); // +2 working days
    expect(iso(w.latestMs)).toBe('2026-01-07'); // +4 working days
    expect(w.earliestMs).toBeLessThanOrEqual(w.latestMs);
  });
});

describe('preOrderWindow', () => {
  it('starts production when the drop opens if that is in the future', () => {
    const release = THU + 7 * DAY; // next Thursday
    const w = preOrderWindow(release, THU);
    // production begins at release, not now
    expect(w.earliestMs).toBe(madeToOrderWindow(release).earliestMs);
    expect(w.earliestMs).toBeGreaterThan(madeToOrderWindow(THU).earliestMs);
  });

  it('starts production now if the drop is already open', () => {
    const release = THU - 3 * DAY;
    expect(preOrderWindow(release, THU)).toEqual(madeToOrderWindow(THU));
  });
});

describe('isPreOrderStatus', () => {
  it('is true only for upcoming and early access', () => {
    expect(isPreOrderStatus('upcoming')).toBe(true);
    expect(isPreOrderStatus('early_access')).toBe(true);
    expect(isPreOrderStatus('live')).toBe(false);
    expect(isPreOrderStatus('ended')).toBe(false);
    expect(isPreOrderStatus('sold_out')).toBe(false);
  });
});

describe('madeToOrderSummary', () => {
  it('names the production lead window', () => {
    expect(madeToOrderSummary()).toContain(`${PRODUCTION_LEAD.minDays}–${PRODUCTION_LEAD.maxDays}`);
  });
});
