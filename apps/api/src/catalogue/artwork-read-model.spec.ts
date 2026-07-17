import { describe, expect, it } from 'vitest';

import { deriveArtworkAvailability, deriveStartingPrice } from './artwork-read-model.js';

const now = new Date('2026-07-17T12:00:00.000Z');
const past = new Date('2026-07-01T00:00:00.000Z');
const future = new Date('2026-08-01T00:00:00.000Z');

describe('deriveStartingPrice', () => {
  it('returns null when there are no approved priced pairs', () => {
    expect(deriveStartingPrice([])).toBeNull();
    expect(deriveStartingPrice([{ unitPriceMinor: null, currency: null }])).toBeNull();
  });

  it('picks the lowest approved amount and its currency', () => {
    expect(
      deriveStartingPrice([
        { unitPriceMinor: 2_800_000, currency: 'NGN' },
        { unitPriceMinor: 900_000, currency: 'NGN' },
        { unitPriceMinor: 1_400_000, currency: 'NGN' },
      ]),
    ).toEqual({ amountMinor: 900_000, currency: 'NGN' });
  });

  it('ignores rows missing a price or currency', () => {
    expect(
      deriveStartingPrice([
        { unitPriceMinor: null, currency: 'NGN' },
        { unitPriceMinor: 1_400_000, currency: null },
        { unitPriceMinor: 1_400_000, currency: 'NGN' },
      ]),
    ).toEqual({ amountMinor: 1_400_000, currency: 'NGN' });
  });
});

describe('deriveArtworkAvailability', () => {
  it('is AVAILABLE for an artwork in no drop', () => {
    expect(deriveArtworkAvailability([], now)).toBe('AVAILABLE');
  });

  it('is AVAILABLE inside an open drop window', () => {
    expect(deriveArtworkAvailability([{ startsAt: past, endsAt: future }], now)).toBe('AVAILABLE');
    expect(deriveArtworkAvailability([{ startsAt: null, endsAt: null }], now)).toBe('AVAILABLE');
  });

  it('is DROP_NOT_OPEN when the only drop is upcoming', () => {
    expect(deriveArtworkAvailability([{ startsAt: future, endsAt: null }], now)).toBe(
      'DROP_NOT_OPEN',
    );
  });

  it('is DROP_ENDED when every drop has ended', () => {
    expect(deriveArtworkAvailability([{ startsAt: past, endsAt: past }], now)).toBe('DROP_ENDED');
  });

  it('prefers an open drop over an upcoming or ended one', () => {
    expect(
      deriveArtworkAvailability(
        [
          { startsAt: past, endsAt: past },
          { startsAt: past, endsAt: future },
          { startsAt: future, endsAt: null },
        ],
        now,
      ),
    ).toBe('AVAILABLE');
  });
});
