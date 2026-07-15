import type { ArtworkSort, Availability } from './data/types';
import { ARTWORK_SORTS, AVAILABILITIES } from './data/types';

export interface ArtworkFilters {
  collection?: string;
  availability?: Availability;
  sort: ArtworkSort;
}

export const DEFAULT_SORT: ArtworkSort = 'newest';

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  const trimmed = v?.trim();
  return trimmed ? trimmed : undefined;
}

/** Parse and validate gallery filters from URL search params. Invalid values are dropped. */
export function parseArtworkFilters(searchParams: RawSearchParams): ArtworkFilters {
  const collection = first(searchParams.collection);

  const availabilityRaw = first(searchParams.availability);
  const availability = AVAILABILITIES.find((a) => a === availabilityRaw);

  const sortRaw = first(searchParams.sort);
  const sort = ARTWORK_SORTS.find((s) => s === sortRaw) ?? DEFAULT_SORT;

  return { collection, availability, sort };
}

/**
 * Build a `?query` string for the given filters, omitting defaults and empties so
 * shareable URLs stay clean. Returns "" when no filters are active.
 */
export function buildArtworkQuery(filters: Partial<ArtworkFilters>): string {
  const params = new URLSearchParams();
  if (filters.collection) params.set('collection', filters.collection);
  if (filters.availability) params.set('availability', filters.availability);
  if (filters.sort && filters.sort !== DEFAULT_SORT) params.set('sort', filters.sort);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** True when any non-default filter is active. */
export function hasActiveFilters(filters: ArtworkFilters): boolean {
  return Boolean(filters.collection || filters.availability || filters.sort !== DEFAULT_SORT);
}
