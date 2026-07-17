import { describe, expect, it } from 'vitest';
import type { DropSummary } from './data/types';
import {
  countdownLabel,
  countdownParts,
  dropStatus,
  dropStatusLabel,
  dropStatusTone,
  nextMilestone,
  sortDrops,
} from './drops';

const NOW = Date.parse('2026-07-15T12:00:00.000Z');
const at = (offsetMs: number): string => new Date(NOW + offsetMs).toISOString();
const HOUR = 3_600_000;
const DAY = 86_400_000;

function drop(overrides: Partial<DropSummary> = {}): DropSummary {
  return {
    slug: 'test-drop',
    title: 'Test Drop',
    tagline: 'A test drop.',
    collection: 'Night Studies',
    earlyAccessAt: at(1 * DAY),
    releaseAt: at(2 * DAY),
    endsAt: at(9 * DAY),
    pieceCount: 3,
    soldOut: false,
    ...overrides,
  };
}

describe('dropStatus', () => {
  it('is upcoming before the early-access window', () => {
    expect(dropStatus(drop(), NOW)).toBe('upcoming');
  });

  it('is early_access inside the early window but before release', () => {
    const d = drop({ earlyAccessAt: at(-1 * HOUR), releaseAt: at(1 * DAY) });
    expect(dropStatus(d, NOW)).toBe('early_access');
  });

  it('is live at/after release and before the end', () => {
    const d = drop({ earlyAccessAt: at(-2 * DAY), releaseAt: at(-1 * DAY), endsAt: at(3 * DAY) });
    expect(dropStatus(d, NOW)).toBe('live');
  });

  it('is ended at/after the end time', () => {
    const d = drop({ earlyAccessAt: at(-10 * DAY), releaseAt: at(-9 * DAY), endsAt: at(-1 * DAY) });
    expect(dropStatus(d, NOW)).toBe('ended');
  });

  it('is sold_out regardless of the window when soldOut is set', () => {
    const d = drop({
      earlyAccessAt: at(-2 * DAY),
      releaseAt: at(-1 * DAY),
      endsAt: at(3 * DAY),
      soldOut: true,
    });
    expect(dropStatus(d, NOW)).toBe('sold_out');
  });

  it('treats an open-ended live drop (endsAt null) as live', () => {
    const d = drop({ earlyAccessAt: null, releaseAt: at(-1 * DAY), endsAt: null });
    expect(dropStatus(d, NOW)).toBe('live');
  });

  it('goes straight to live at release when there is no early window', () => {
    const d = drop({ earlyAccessAt: null, releaseAt: at(-1), endsAt: at(1 * DAY) });
    expect(dropStatus(d, NOW)).toBe('live');
  });
});

describe('labels and tones', () => {
  it('maps every status to a label and a tone', () => {
    const statuses = ['upcoming', 'early_access', 'live', 'ended', 'sold_out'] as const;
    for (const s of statuses) {
      expect(dropStatusLabel(s)).toBeTruthy();
      expect(dropStatusTone(s)).toBeTruthy();
    }
    expect(dropStatusLabel('live')).toBe('Live now');
    expect(dropStatusTone('live')).toBe('success');
    expect(dropStatusTone('sold_out')).toBe('warning');
  });
});

describe('nextMilestone', () => {
  it('counts down to early access when a window is pending', () => {
    const m = nextMilestone(drop(), NOW);
    expect(m.label).toBe('Early access opens');
    expect(m.at).toBe(Date.parse(drop().earlyAccessAt!));
  });

  it('counts down to release with no early window', () => {
    const d = drop({ earlyAccessAt: null, releaseAt: at(2 * DAY) });
    expect(nextMilestone(d, NOW)).toEqual({ label: 'Drop opens', at: Date.parse(d.releaseAt) });
  });

  it('counts down to release during early access', () => {
    const d = drop({ earlyAccessAt: at(-1 * HOUR), releaseAt: at(1 * DAY) });
    const m = nextMilestone(d, NOW);
    expect(m.label).toBe('Public release');
    expect(m.at).toBe(Date.parse(d.releaseAt));
  });

  it('counts down to the close when live and time-bound', () => {
    const d = drop({ earlyAccessAt: at(-2 * DAY), releaseAt: at(-1 * DAY), endsAt: at(3 * DAY) });
    const m = nextMilestone(d, NOW);
    expect(m.label).toBe('Drop closes');
    expect(m.at).toBe(Date.parse(d.endsAt!));
  });

  it('has no pending milestone once ended or sold out', () => {
    const ended = drop({ releaseAt: at(-9 * DAY), endsAt: at(-1 * DAY) });
    expect(nextMilestone(ended, NOW).at).toBeNull();
    const sold = drop({ soldOut: true });
    expect(nextMilestone(sold, NOW).at).toBeNull();
  });
});

describe('countdownParts', () => {
  it('breaks a span into day/hour/minute/second parts', () => {
    const ms = 2 * DAY + 4 * HOUR + 5 * 60_000 + 6 * 1000;
    expect(countdownParts(ms)).toEqual({ days: 2, hours: 4, minutes: 5, seconds: 6, total: ms });
  });

  it('floors a negative span at zero', () => {
    expect(countdownParts(-5000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });
  });
});

describe('countdownLabel', () => {
  it('spells out the two most significant units', () => {
    expect(countdownLabel(2 * DAY + 4 * HOUR + 30 * 60_000)).toBe('2 days, 4 hours');
  });
  it('singularises a single unit', () => {
    expect(countdownLabel(1 * DAY)).toBe('1 day');
  });
  it('handles a fully elapsed span', () => {
    expect(countdownLabel(0)).toBe('less than a second');
  });
});

describe('sortDrops', () => {
  it('orders active drops before finished ones, soonest milestone first', () => {
    const upcoming = drop({
      slug: 'upcoming',
      earlyAccessAt: at(1 * DAY),
      releaseAt: at(2 * DAY),
      endsAt: at(9 * DAY),
    });
    const live = drop({
      slug: 'live',
      earlyAccessAt: at(-2 * DAY),
      releaseAt: at(-1 * DAY),
      endsAt: at(3 * DAY),
    });
    const early = drop({
      slug: 'early',
      earlyAccessAt: at(-1 * HOUR),
      releaseAt: at(1 * DAY),
      endsAt: at(8 * DAY),
    });
    const ended = drop({
      slug: 'ended',
      earlyAccessAt: at(-10 * DAY),
      releaseAt: at(-9 * DAY),
      endsAt: at(-1 * DAY),
    });
    const sold = drop({ slug: 'sold', soldOut: true });

    const order = sortDrops([ended, sold, upcoming, live, early], NOW).map((d) => d.slug);
    expect(order).toEqual(['live', 'early', 'upcoming', 'sold', 'ended']);
  });

  it('is stable for drops that tie', () => {
    const a = drop({ slug: 'a', soldOut: true });
    const b = drop({ slug: 'b', soldOut: true });
    expect(sortDrops([a, b], NOW).map((d) => d.slug)).toEqual(['a', 'b']);
  });

  it('does not mutate its input', () => {
    const input = [drop({ slug: 'x' }), drop({ slug: 'y' })];
    const snapshot = input.map((d) => d.slug);
    sortDrops(input, NOW);
    expect(input.map((d) => d.slug)).toEqual(snapshot);
  });
});
