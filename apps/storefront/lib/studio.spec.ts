import { describe, expect, it } from 'vitest';
import type { StudioOptions } from './data/types';
import {
  buildStudioQuery,
  EMPTY_STUDIO_CONFIG,
  findVariantId,
  isStudioConfigComplete,
  parseStudioParams,
  resolveStudioConfig,
  type StudioConfig,
} from './studio';

const full: StudioConfig = {
  artwork: 'midnight-in-lagos',
  garment: 'classic-tshirt',
  colour: 'Black',
  size: 'M',
  placement: 'placement-centre-chest',
  scale: 'medium',
  view: 'back',
  quantity: 3,
};

/** One artwork's approved canvases: a front and a back placement, each with its own scales. */
const options: StudioOptions = {
  garments: [
    {
      slug: 'classic-tshirt',
      title: 'Classic T-shirt',
      artworkVersionId: 'av1',
      colours: [
        { name: 'Black', hex: '#1a1a1a', available: true },
        { name: 'Bone', hex: '#efeae0', available: true },
      ],
      sizes: ['S', 'M'],
      variants: [
        { id: 'v-black-s', colour: 'Black', size: 'S' },
        { id: 'v-black-m', colour: 'Black', size: 'M' },
        // Bone is only made in S, so Bone+M is not a buyable pair.
        { id: 'v-bone-s', colour: 'Bone', size: 'S' },
      ],
      placements: [
        {
          id: 'placement-centre-chest',
          label: 'Centre chest',
          area: 'front',
          x: 50,
          y: 38,
          printWidthMm: 280,
          printHeightMm: 350,
          scalePresets: [
            { slug: 'small', label: 'Small', widthPct: 30 },
            { slug: 'medium', label: 'Medium', widthPct: 44 },
          ],
        },
        {
          id: 'placement-back',
          label: 'Back',
          area: 'back',
          x: 50,
          y: 42,
          printWidthMm: 320,
          printHeightMm: 400,
          // Deliberately different from the front's: presets belong to a placement.
          scalePresets: [{ slug: 'large', label: 'Large', widthPct: 64 }],
        },
      ],
    },
  ],
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

  it('carries no print geometry: approved placements are the only geometry (ADR-013)', () => {
    const parsed = parseStudioParams({
      artwork: 'midnight-in-lagos',
      printX: '47.5',
      printY: '44',
      printWidth: '38',
      cropZoom: '1.4',
      cropX: '-8',
      cropY: '12',
    });
    expect(parsed).toEqual({ ...EMPTY_STUDIO_CONFIG, artwork: 'midnight-in-lagos' });
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

  it('shares approved ids, never percentages', () => {
    const qs = buildStudioQuery(full);
    expect(qs).toContain('placement=placement-centre-chest');
    expect(qs).toContain('scale=medium');
    expect(qs).not.toMatch(/printX|printY|printWidth|crop/);
  });
});

describe('resolveStudioConfig', () => {
  it('keeps an approved placement and scale as they are', () => {
    const resolved = resolveStudioConfig({ ...full, view: 'front' }, options);
    expect(resolved.placement).toBe('placement-centre-chest');
    expect(resolved.scale).toBe('medium');
  });

  it('drops a placement this garment was never approved for, and picks one that is', () => {
    // A link carrying another garment's placement id must not survive into what we send.
    const resolved = resolveStudioConfig(
      { ...full, view: 'front', placement: 'placement-from-elsewhere' },
      options,
    );
    expect(resolved.placement).toBe('placement-centre-chest');
  });

  it('replaces an unapproved placement with one on the side being viewed', () => {
    const resolved = resolveStudioConfig(
      { ...full, view: 'back', placement: 'placement-from-elsewhere' },
      options,
    );
    expect(resolved.placement).toBe('placement-back');
  });

  it('drops a scale that does not belong to the chosen placement', () => {
    // `large` exists, but only on the back placement.
    const resolved = resolveStudioConfig(
      { ...full, placement: 'placement-centre-chest', scale: 'large' },
      options,
    );
    expect(resolved.scale).toBe('small');
  });

  it('re-picks the scale when the placement changes, since presets belong to a placement', () => {
    const resolved = resolveStudioConfig({ ...full, placement: 'placement-back' }, options);
    expect(resolved.scale).toBe('large');
  });

  it('drops a colour with no approved variant', () => {
    const resolved = resolveStudioConfig({ ...full, colour: 'Chartreuse' }, options);
    expect(resolved.colour).toBe('Black');
  });

  it('drops a size that is not made in the chosen colour', () => {
    // Bone exists, but not in M.
    const resolved = resolveStudioConfig({ ...full, colour: 'Bone', size: 'M' }, options);
    expect(resolved.size).toBe('S');
  });

  it('falls back to the first approved garment when the URL names an unknown one', () => {
    const resolved = resolveStudioConfig({ ...full, garment: 'nope' }, options);
    expect(resolved.garment).toBe('classic-tshirt');
  });

  it('clears everything when the artwork has no approved garment', () => {
    const resolved = resolveStudioConfig(full, { garments: [] });
    expect(resolved).toMatchObject({ garment: null, colour: null, size: null, placement: null });
  });

  it('leaves the view alone, so turning the garment around does not fight the customer', () => {
    const resolved = resolveStudioConfig({ ...full, view: 'back' }, options);
    expect(resolved.view).toBe('back');
    // The print is still on the front placement; the UI says so rather than moving it.
    expect(resolved.placement).toBe('placement-centre-chest');
  });
});

describe('findVariantId', () => {
  it('finds the approved variant for a colour and size', () => {
    expect(findVariantId(full, options.garments[0]!)).toBe('v-black-m');
  });

  it('returns null for a pair with no variant, rather than guessing one', () => {
    expect(findVariantId({ ...full, colour: 'Bone', size: 'M' }, options.garments[0]!)).toBeNull();
  });
});

describe('isStudioConfigComplete', () => {
  it('requires the whole approved tuple', () => {
    expect(isStudioConfigComplete(EMPTY_STUDIO_CONFIG)).toBe(false);
    expect(isStudioConfigComplete({ ...full, size: null })).toBe(false);
    expect(isStudioConfigComplete({ ...full, placement: null })).toBe(false);
    expect(isStudioConfigComplete({ ...full, scale: null })).toBe(false);
    expect(isStudioConfigComplete(full)).toBe(true);
  });
});
