import { describe, expect, it } from 'vitest';
import { addEntry, hasEmail, waitlistKey, type WaitlistEntry } from './waitlist';

const NOW = Date.parse('2026-07-15T12:00:00.000Z');
const entry = (email: string): WaitlistEntry => ({ email, joinedAt: new Date(NOW).toISOString() });

describe('waitlistKey', () => {
  it('namespaces by kind and id', () => {
    expect(waitlistKey('product', 'classic-tee')).toBe('product:classic-tee');
    expect(waitlistKey('drop', 'night-market')).toBe('drop:night-market');
  });
});

describe('hasEmail', () => {
  it('matches case-insensitively', () => {
    const list = [entry('fan@example.com')];
    expect(hasEmail(list, 'FAN@example.com')).toBe(true);
    expect(hasEmail(list, '  fan@example.com  ')).toBe(true);
    expect(hasEmail(list, 'other@example.com')).toBe(false);
  });

  it('is false for an empty list', () => {
    expect(hasEmail([], 'fan@example.com')).toBe(false);
  });
});

describe('addEntry', () => {
  it('appends a normalised entry', () => {
    const next = addEntry([], '  Fan@Example.com ', NOW);
    expect(next).toEqual([{ email: 'fan@example.com', joinedAt: new Date(NOW).toISOString() }]);
  });

  it('does not add a duplicate (case-insensitive) and returns the same reference', () => {
    const list = [entry('fan@example.com')];
    const next = addEntry(list, 'FAN@example.com', NOW);
    expect(next).toBe(list);
    expect(next.length).toBe(1);
  });

  it('does not mutate the input list', () => {
    const list = [entry('a@example.com')];
    addEntry(list, 'b@example.com', NOW);
    expect(list.length).toBe(1);
  });
});
