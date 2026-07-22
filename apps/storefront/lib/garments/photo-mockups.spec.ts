import { describe, expect, it } from 'vitest';
import {
  FALLBACK_PHOTO_SLUG,
  PHOTO_COLOURS,
  photoForView,
  resolvePhotoColour,
} from './photo-mockups';

describe('resolvePhotoColour — the five current catalogue colours', () => {
  // Requirement 3: Black, Bone, Sand, Olive, Slate must use the matching supplied photograph.
  it.each([
    ['Black', 'black'],
    ['Bone', 'bone'],
    ['Sand', 'sand'],
    ['Olive', 'olive'],
    ['Slate', 'slate'],
  ])('%s resolves to its exact %s photograph', (name, slug) => {
    const r = resolvePhotoColour(name);
    expect(r.slug).toBe(slug);
    expect(r.exact).toBe(true);
    expect(r.front).toBe(`/garments/${slug}-front.webp`);
    expect(r.back).toBe(`/garments/${slug}-back.webp`);
  });
});

describe('resolvePhotoColour — the other supplied photo colours', () => {
  it.each([
    ['Red', 'red'],
    ['White', 'white'],
    ['Brown', 'brown'],
    ['Navy', 'navy'],
    ['Burgundy', 'burgundy'],
  ])('%s resolves exactly to %s', (name, slug) => {
    const r = resolvePhotoColour(name);
    expect(r.slug).toBe(slug);
    expect(r.exact).toBe(true);
  });
});

describe('resolvePhotoColour — matching is forgiving', () => {
  it('is case- and whitespace-insensitive', () => {
    expect(resolvePhotoColour('  black ').slug).toBe('black');
    expect(resolvePhotoColour('BLACK').slug).toBe('black');
    expect(resolvePhotoColour('Slate').exact).toBe(true);
  });

  it.each([
    ['Charcoal', 'slate'],
    ['Graphite', 'slate'],
    ['Grey', 'slate'],
    ['Cream', 'bone'],
    ['Ivory', 'bone'],
    ['Tan', 'sand'],
    ['Beige', 'sand'],
    ['Khaki', 'sand'],
    ['Green', 'olive'],
    ['Forest', 'olive'],
    ['Maroon', 'burgundy'],
    ['Navy Blue', 'navy'],
    ['Chocolate', 'brown'],
  ])('synonym %s resolves to the %s photograph exactly', (name, slug) => {
    const r = resolvePhotoColour(name);
    expect(r.slug).toBe(slug);
    expect(r.exact).toBe(true);
  });
});

describe('resolvePhotoColour — fallbacks are honest', () => {
  it('maps a near-black hex to the closest photo, not claiming an exact match', () => {
    const r = resolvePhotoColour('#000000');
    expect(r.exact).toBe(false);
    expect(r.slug).toBe('black');
  });

  it('maps a near-white hex to the closest light photo', () => {
    const r = resolvePhotoColour('#ffffff');
    expect(r.exact).toBe(false);
    expect(['white', 'bone']).toContain(r.slug);
  });

  it('maps a navy-ish hex to navy as the closest photo', () => {
    const r = resolvePhotoColour('#232f4a');
    expect(r.exact).toBe(false);
    expect(r.slug).toBe('navy');
  });

  it('accepts short (#rgb) hex form', () => {
    expect(resolvePhotoColour('#000').slug).toBe('black');
    expect(resolvePhotoColour('#000').exact).toBe(false);
  });

  it('falls back to Bone for an unknown colour name, marked not-exact', () => {
    const r = resolvePhotoColour('Fuchsia');
    expect(r.slug).toBe(FALLBACK_PHOTO_SLUG);
    expect(r.exact).toBe(false);
  });

  it('falls back to Bone for empty / null input', () => {
    expect(resolvePhotoColour(null).slug).toBe(FALLBACK_PHOTO_SLUG);
    expect(resolvePhotoColour(undefined).slug).toBe(FALLBACK_PHOTO_SLUG);
    expect(resolvePhotoColour('').exact).toBe(false);
  });
});

describe('photoForView — front and back are distinct photographs', () => {
  it('returns the photographed front for the front view and back for the back view', () => {
    const black = PHOTO_COLOURS.black!;
    expect(photoForView(black, 'front')).toBe('/garments/black-front.webp');
    expect(photoForView(black, 'back')).toBe('/garments/black-back.webp');
  });

  it('never returns the same asset for front and back (not a mirror of one side)', () => {
    for (const c of Object.values(PHOTO_COLOURS)) {
      expect(photoForView(c, 'front')).not.toBe(photoForView(c, 'back'));
    }
  });
});

describe('PHOTO_COLOURS — fabric-aware blend flags', () => {
  it('flags dark cloth as dark and light cloth as light', () => {
    expect(PHOTO_COLOURS.black!.isDark).toBe(true);
    expect(PHOTO_COLOURS.navy!.isDark).toBe(true);
    expect(PHOTO_COLOURS.olive!.isDark).toBe(true);
    expect(PHOTO_COLOURS.white!.isDark).toBe(false);
    expect(PHOTO_COLOURS.bone!.isDark).toBe(false);
    expect(PHOTO_COLOURS.sand!.isDark).toBe(false);
  });

  it('every colour points at a well-formed front/back webp pair', () => {
    for (const [slug, c] of Object.entries(PHOTO_COLOURS)) {
      expect(c.front).toBe(`/garments/${slug}-front.webp`);
      expect(c.back).toBe(`/garments/${slug}-back.webp`);
      expect(c.hex).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
