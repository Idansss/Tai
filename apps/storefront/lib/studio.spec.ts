import { describe, expect, it } from 'vitest';
import type { StudioOptions } from './data/types';
import {
  buildStudioQuery,
  clampTransform,
  EMPTY_STUDIO_CONFIG,
  findVariantId,
  IDENTITY_TRANSFORM,
  isIdentityTransform,
  isStudioConfigComplete,
  parseStudioParams,
  type PrintTransform,
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
  transform: IDENTITY_TRANSFORM,
  view: 'back',
  quantity: 3,
};

/** A non-identity transform, for round-trip + resolve tests. */
const moved: PrintTransform = {
  dx: 8.5,
  dy: -6.25,
  scale: 1.4,
  rotation: 12,
  cropTop: 0.1,
  cropRight: 0,
  cropBottom: 0.05,
  cropLeft: 0.2,
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

  it('reads a free-placement transform (drag/resize/rotate/crop)', () => {
    const parsed = parseStudioParams({
      artwork: 'midnight-in-lagos',
      px: '8.5',
      py: '-6.25',
      ps: '1.4',
      pr: '12',
      ct: '0.1',
      cb: '0.05',
      cl: '0.2',
    });
    expect(parsed.transform).toEqual(moved);
  });

  it('defaults to the identity transform when no geometry params are present', () => {
    expect(parseStudioParams({ artwork: 'midnight-in-lagos' }).transform).toEqual(
      IDENTITY_TRANSFORM,
    );
  });

  it('clamps a hostile transform from the URL into the safe range', () => {
    const parsed = parseStudioParams({ px: '999', ps: '50', pr: '540', ct: '0.8', cb: '0.8' });
    expect(parsed.transform.dx).toBe(60);
    expect(parsed.transform.scale).toBe(3);
    expect(parsed.transform.rotation).toBe(180);
    // Opposite crops can never together swallow more than 90% of the artwork.
    expect(parsed.transform.cropTop + parsed.transform.cropBottom).toBeLessThanOrEqual(0.9 + 1e-9);
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

  it('round-trips a config with a free transform', () => {
    const qs = buildStudioQuery({ ...full, transform: moved });
    const params = Object.fromEntries(new URLSearchParams(qs.slice(1)));
    expect(parseStudioParams(params)).toEqual({ ...full, transform: moved });
  });

  it('omits transform params that are at their identity value', () => {
    const qs = buildStudioQuery({ ...full, transform: { ...IDENTITY_TRANSFORM, dx: 5 } });
    expect(qs).toContain('px=5');
    expect(qs).not.toMatch(/py=|ps=|pr=|ct=|cr=|cb=|cl=/);
  });

  it('shares the approved ids alongside the geometry', () => {
    const qs = buildStudioQuery({ ...full, transform: moved });
    expect(qs).toContain('placement=placement-centre-chest');
    expect(qs).toContain('scale=medium');
    expect(qs).toContain('px=8.5');
  });
});

describe('clampTransform / isIdentityTransform', () => {
  it('recognises the identity transform', () => {
    expect(isIdentityTransform(IDENTITY_TRANSFORM)).toBe(true);
    expect(isIdentityTransform({ ...IDENTITY_TRANSFORM, rotation: 1 })).toBe(false);
  });

  it('bounds scale, offset and rotation', () => {
    const t = clampTransform({ ...IDENTITY_TRANSFORM, dx: -900, scale: 0.01, rotation: 200 });
    expect(t.dx).toBe(-60);
    expect(t.scale).toBe(0.2);
    expect(t.rotation).toBe(-160); // 200° wraps to −160°
  });

  it('scales an over-cropped axis down proportionally rather than clipping to zero', () => {
    const t = clampTransform({ ...IDENTITY_TRANSFORM, cropLeft: 0.6, cropRight: 0.6 });
    expect(t.cropLeft).toBeCloseTo(0.45);
    expect(t.cropRight).toBeCloseTo(0.45);
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

  it('keeps the free transform when its placement and scale both survive', () => {
    const resolved = resolveStudioConfig(
      {
        ...full,
        view: 'front',
        placement: 'placement-centre-chest',
        scale: 'medium',
        transform: moved,
      },
      options,
    );
    expect(resolved.transform).toEqual(moved);
  });

  it('resets the transform when the placement it was authored against is dropped', () => {
    // The delta means nothing once we swap to a different, approved placement.
    const resolved = resolveStudioConfig(
      { ...full, view: 'front', placement: 'placement-from-elsewhere', transform: moved },
      options,
    );
    expect(resolved.placement).toBe('placement-centre-chest');
    expect(resolved.transform).toEqual(IDENTITY_TRANSFORM);
  });

  it('resets the transform when the scale is re-picked because the placement changed', () => {
    const resolved = resolveStudioConfig(
      { ...full, placement: 'placement-back', transform: moved },
      options,
    );
    expect(resolved.scale).toBe('large');
    expect(resolved.transform).toEqual(IDENTITY_TRANSFORM);
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
