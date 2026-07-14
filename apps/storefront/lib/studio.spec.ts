import { describe, expect, it } from 'vitest';
import {
  buildStudioQuery,
  EMPTY_STUDIO_CONFIG,
  isStudioConfigComplete,
  parseStudioParams,
  type StudioConfig,
} from './studio';

const full: StudioConfig = {
  artwork: 'midnight-in-lagos',
  garment: 'Classic T-shirt',
  colour: 'Black',
  size: 'M',
  placement: 'centre-chest',
  scale: 'medium',
  view: 'back',
  quantity: 3,
};

describe('parseStudioParams', () => {
  it('returns the empty config for no params', () => {
    expect(parseStudioParams({})).toEqual(EMPTY_STUDIO_CONFIG);
  });

  it('defaults view to front and clamps quantity to [1,10]', () => {
    expect(parseStudioParams({ view: 'sideways', quantity: '99' }).view).toBe('front');
    expect(parseStudioParams({ quantity: '99' }).quantity).toBe(10);
    expect(parseStudioParams({ quantity: '0' }).quantity).toBe(1);
    expect(parseStudioParams({ quantity: 'x' }).quantity).toBe(1);
  });

  it('reads all fields', () => {
    expect(
      parseStudioParams({ artwork: 'midnight-in-lagos', view: 'back', quantity: '3' }),
    ).toEqual({ ...EMPTY_STUDIO_CONFIG, artwork: 'midnight-in-lagos', view: 'back', quantity: 3 });
  });
});

describe('buildStudioQuery / round-trip', () => {
  it('omits defaults', () => {
    expect(buildStudioQuery(EMPTY_STUDIO_CONFIG)).toBe('');
  });

  it('round-trips a full config', () => {
    const qs = buildStudioQuery(full);
    const params = Object.fromEntries(new URLSearchParams(qs.slice(1)));
    expect(parseStudioParams(params)).toEqual(full);
  });
});

describe('isStudioConfigComplete', () => {
  it('requires artwork, garment, colour and size', () => {
    expect(isStudioConfigComplete(EMPTY_STUDIO_CONFIG)).toBe(false);
    expect(isStudioConfigComplete({ ...full, size: null })).toBe(false);
    expect(isStudioConfigComplete(full)).toBe(true);
  });
});
