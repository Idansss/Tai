import { describe, expect, it } from 'vitest';
import { artworkVersionId, passportSerial } from './passport';

describe('artworkVersionId', () => {
  const base = { slug: 'midnight-in-lagos', edition: 'Limited edition of 100', release: '2026' };

  it('formats as AP-XXXX-XXXX with uppercase hex groups', () => {
    expect(artworkVersionId(base)).toMatch(/^AP-[0-9A-F]{4}-[0-9A-F]{4}$/);
  });

  it('is deterministic, same content yields the same id', () => {
    expect(artworkVersionId(base)).toBe(artworkVersionId({ ...base }));
  });

  it('changes when any identifying field changes (a new version)', () => {
    const id = artworkVersionId(base);
    expect(artworkVersionId({ ...base, slug: 'paper-tigers' })).not.toBe(id);
    expect(artworkVersionId({ ...base, edition: 'Open edition' })).not.toBe(id);
    expect(artworkVersionId({ ...base, release: '2027' })).not.toBe(id);
  });

  it('produces distinct ids across a set of artworks (no obvious collisions)', () => {
    const slugs = [
      'midnight-in-lagos',
      'paper-tigers',
      'harmattan-bloom',
      'lantern-keeper',
      'the-getaway',
      'rainy-season',
      'market-day',
      'okada-run',
    ];
    const ids = new Set(slugs.map((slug) => artworkVersionId({ ...base, slug })));
    expect(ids.size).toBe(slugs.length);
  });
});

describe('passportSerial', () => {
  it('zero-pads the index to the width of the run size', () => {
    expect(passportSerial(7, 100)).toBe('No. 007 / 100');
    expect(passportSerial(42, 100)).toBe('No. 042 / 100');
  });

  it('does not truncate an index already at full width', () => {
    expect(passportSerial(100, 100)).toBe('No. 100 / 100');
  });

  it('handles a run size with a different digit width', () => {
    expect(passportSerial(5, 50)).toBe('No. 05 / 50');
  });
});
