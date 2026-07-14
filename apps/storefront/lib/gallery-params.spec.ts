import { describe, expect, it } from 'vitest';
import {
  buildArtworkQuery,
  DEFAULT_SORT,
  hasActiveFilters,
  parseArtworkFilters,
} from './gallery-params';

describe('parseArtworkFilters', () => {
  it('defaults to newest sort with no params', () => {
    expect(parseArtworkFilters({})).toEqual({
      collection: undefined,
      availability: undefined,
      sort: 'newest',
    });
  });

  it('reads valid values', () => {
    expect(
      parseArtworkFilters({
        collection: 'Night Studies',
        availability: 'limited',
        sort: 'popular',
      }),
    ).toEqual({ collection: 'Night Studies', availability: 'limited', sort: 'popular' });
  });

  it('drops invalid availability and sort', () => {
    expect(parseArtworkFilters({ availability: 'exploded', sort: 'sideways' })).toEqual({
      collection: undefined,
      availability: undefined,
      sort: DEFAULT_SORT,
    });
  });

  it('takes the first value of an array and trims blanks', () => {
    expect(parseArtworkFilters({ collection: ['  Comic Line  ', 'x'] }).collection).toBe(
      'Comic Line',
    );
    expect(parseArtworkFilters({ collection: '   ' }).collection).toBeUndefined();
  });
});

describe('buildArtworkQuery', () => {
  it('is empty for defaults', () => {
    expect(buildArtworkQuery({ sort: 'newest' })).toBe('');
    expect(buildArtworkQuery({})).toBe('');
  });

  it('omits the default sort but keeps active filters', () => {
    expect(buildArtworkQuery({ collection: 'Comic Line', sort: 'newest' })).toBe(
      '?collection=Comic+Line',
    );
    expect(buildArtworkQuery({ availability: 'available', sort: 'popular' })).toBe(
      '?availability=available&sort=popular',
    );
  });
});

describe('hasActiveFilters', () => {
  it('is false only for the pristine default', () => {
    expect(hasActiveFilters({ sort: 'newest' })).toBe(false);
    expect(hasActiveFilters({ sort: 'popular' })).toBe(true);
    expect(hasActiveFilters({ collection: 'Night Studies', sort: 'newest' })).toBe(true);
  });
});
