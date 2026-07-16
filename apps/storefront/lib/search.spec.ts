import { describe, expect, it } from 'vitest';
import type { ArtworkSummary } from './data/types';
import { artworkMatchesQuery, normalizeQuery, queryTerms } from './search';

const artwork: ArtworkSummary = {
  id: 'a1',
  slug: 'midnight-in-lagos',
  title: 'Midnight in Lagos',
  collection: 'Night Studies',
  shortStory: 'Ink and neon from a restless city.',
  availability: 'available',
  startingPriceMinor: 1200000,
  currency: 'NGN',
  compatibleGarments: ['Classic T-shirt'],
  limitedEdition: false,
};

describe('normalizeQuery', () => {
  it('trims, lower-cases and collapses whitespace', () => {
    expect(normalizeQuery('  Midnight   Lagos ')).toBe('midnight lagos');
  });
});

describe('queryTerms', () => {
  it('returns [] for a blank query', () => {
    expect(queryTerms('   ')).toEqual([]);
  });
  it('splits into terms', () => {
    expect(queryTerms('night studies')).toEqual(['night', 'studies']);
  });
});

describe('artworkMatchesQuery', () => {
  it('matches on title', () => {
    expect(artworkMatchesQuery(artwork, 'midnight')).toBe(true);
  });
  it('matches on collection', () => {
    expect(artworkMatchesQuery(artwork, 'night studies')).toBe(true);
  });
  it('matches on short story', () => {
    expect(artworkMatchesQuery(artwork, 'neon')).toBe(true);
  });
  it('requires every term to match (AND)', () => {
    expect(artworkMatchesQuery(artwork, 'midnight kano')).toBe(false);
  });
  it('does not match a blank query', () => {
    expect(artworkMatchesQuery(artwork, '   ')).toBe(false);
  });
  it('is case-insensitive', () => {
    expect(artworkMatchesQuery(artwork, 'LAGOS')).toBe(true);
  });
});
