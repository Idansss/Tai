import { describe, expect, it } from 'vitest';
import { createOrderReference } from './order';

describe('createOrderReference', () => {
  it('has the TMS- prefix and 6 unambiguous characters', () => {
    const ref = createOrderReference();
    expect(ref).toMatch(/^TMS-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  });

  it('is deterministic for a given RNG', () => {
    const rng = () => 0;
    expect(createOrderReference(rng)).toBe('TMS-AAAAAA');
  });

  it('excludes confusable characters (0, O, 1, I)', () => {
    const rng = () => 0.999999;
    expect(createOrderReference(rng)).not.toMatch(/[01OI]/);
  });
});
