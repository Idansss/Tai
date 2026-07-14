import type { ArtworkSummary } from './data/types';

/** Normalise a raw query: trim, lower-case, collapse whitespace. */
export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Split a normalised query into distinct search terms. */
export function queryTerms(query: string): string[] {
  const normalized = normalizeQuery(query);
  return normalized ? normalized.split(' ') : [];
}

/**
 * Match an artwork against a query. Every term must appear somewhere in the
 * title, collection, or short story (AND semantics). An empty query matches
 * nothing so a blank search shows a prompt rather than the whole catalogue.
 */
export function artworkMatchesQuery(artwork: ArtworkSummary, query: string): boolean {
  const terms = queryTerms(query);
  if (terms.length === 0) return false;
  const haystack = `${artwork.title} ${artwork.collection} ${artwork.shortStory}`.toLowerCase();
  return terms.every((term) => haystack.includes(term));
}
