import type { Artwork, CatalogueEntry, CursorPage } from '@tms/contracts';

import { apiFetch, apiFetchOrNull } from './http';
import type {
  ArtworkDetail,
  ArtworkSummary,
  CollectionDetail,
  CollectionSummary,
  ListArtworksParams,
  StorefrontDataProvider,
} from './types';

/**
 * The real API adapter.
 *
 * Only the domains listed as API-capable in ./index.ts are implemented here. The rest still
 * throw: a method that cannot be honestly filled from the contract must fail loudly rather
 * than quietly hand back invented data. Which domain is served by which adapter is decided
 * in ./index.ts, never here.
 *
 * Mapping rule: the backend is the source of truth for identity and narrative; anything the
 * contract does not carry is left null/empty and filed in FRONTEND_TO_BACKEND.md. We never
 * synthesise a price, a stock level, or an availability state.
 */

const notImplemented = (name: string, reason: string): never => {
  throw new Error(
    `apiProvider.${name} has no backend to call: ${reason} See docs/coordination/FRONTEND_TO_BACKEND.md.`,
  );
};

/** The published version carries the narrative; an artwork without one is not listable. */
function toArtworkSummary(artwork: Artwork): ArtworkSummary {
  const version = artwork.publishedVersion;
  return {
    id: artwork.id,
    slug: artwork.slug,
    title: version?.title ?? artwork.slug,
    collection: artwork.collections?.[0]?.title ?? '',
    shortStory: version?.shortStory ?? '',
    // ADR-015 puts price on the approved artwork+garment pair, so an artwork has no single
    // price and the contract carries none. Null renders as "no price yet" rather than ₦0.
    // A `startingPrice` on the list response is TMS-FBR-011.
    startingPriceMinor: null,
    currency: null,
    // Not derivable: stock is TMS-B4-001 and the artwork response carries no availability
    // state. TMS-FBR-012.
    availability: null,
    // The list response does not embed compatible garments, and resolving them per card
    // would be one request per artwork. TMS-FBR-013.
    compatibleGarments: [],
    limitedEdition: (artwork.editions?.length ?? 0) > 0,
  };
}

function toArtworkDetail(artwork: Artwork, related: ArtworkSummary[]): ArtworkDetail {
  const version = artwork.publishedVersion;
  const edition = artwork.editions?.[0];
  return {
    ...toArtworkSummary(artwork),
    story: version?.story ?? '',
    inspiration: version?.inspiration ?? '',
    ...(edition ? { edition: edition.name } : {}),
    ...(artwork.publishedAt ? { release: artwork.publishedAt } : {}),
    related,
  };
}

function toCollectionSummary(entry: CatalogueEntry & { artworkCount?: number }): CollectionSummary {
  return {
    slug: entry.slug,
    name: entry.title,
    description: entry.description ?? '',
    // The catalogue entry does not count its artworks; 0 reads as "unknown" here rather
    // than triggering a fetch per collection. TMS-FBR-014.
    artworkCount: entry.artworkCount ?? 0,
  };
}

export const apiProvider: StorefrontDataProvider = {
  async listArtworks(params: ListArtworksParams = {}): Promise<CursorPage<ArtworkSummary>> {
    // `availability` and sort=popular are deliberately not forwarded: the contract supports
    // neither (sort accepts only `newest`). Passing them would 400. TMS-FBR-012 / -015.
    const page = await apiFetch<CursorPage<Artwork>>('/api/v1/artworks', {
      query: {
        cursor: params.cursor,
        limit: params.limit,
        collection: params.collection,
      },
    });
    return { items: page.items.map(toArtworkSummary), nextCursor: page.nextCursor };
  },

  async getArtwork(slug: string): Promise<ArtworkDetail | null> {
    const artwork = await apiFetchOrNull<Artwork>(`/api/v1/artworks/${encodeURIComponent(slug)}`);
    if (!artwork) return null;

    // "Related" is a storefront idea: approximate it with the artwork's first collection and
    // drop the artwork itself. A real related-artworks endpoint is TMS-FBR-016.
    const collection = artwork.collections?.[0]?.slug;
    let related: ArtworkSummary[] = [];
    if (collection) {
      const page = await apiFetch<CursorPage<Artwork>>('/api/v1/artworks', {
        query: { collection, limit: 5 },
      });
      related = page.items.filter((item) => item.slug !== artwork.slug).map(toArtworkSummary);
    }
    return toArtworkDetail(artwork, related);
  },

  async searchArtworks(query: string, limit = 8): Promise<ArtworkSummary[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const page = await apiFetch<CursorPage<Artwork>>('/api/v1/artworks', {
      query: { q: trimmed, limit },
    });
    return page.items.map(toArtworkSummary);
  },

  async listCollections(): Promise<string[]> {
    const entries = await apiFetch<CatalogueEntry[]>('/api/v1/collections');
    return entries.map((entry) => entry.title);
  },

  async listCollectionSummaries(): Promise<CollectionSummary[]> {
    const entries = await apiFetch<CatalogueEntry[]>('/api/v1/collections');
    return entries.map(toCollectionSummary);
  },

  async getCollection(slug: string): Promise<CollectionDetail | null> {
    const entry = await apiFetchOrNull<CatalogueEntry>(
      `/api/v1/collections/${encodeURIComponent(slug)}`,
    );
    if (!entry) return null;
    const page = await apiFetch<CursorPage<Artwork>>('/api/v1/artworks', {
      query: { collection: entry.slug, limit: 100 },
    });
    const artworks = page.items.map(toArtworkSummary);
    return { ...toCollectionSummary({ ...entry, artworkCount: artworks.length }), artworks };
  },

  listProducts() {
    return notImplemented(
      'listProducts',
      'a product is a storefront composition of an artwork and a garment, and there is no /products endpoint (TMS-FBR-010).',
    );
  },
  getProduct() {
    return notImplemented(
      'getProduct',
      'a product is a storefront composition of an artwork and a garment, and there is no /products endpoint (TMS-FBR-010).',
    );
  },
  getStudioOptions() {
    return notImplemented(
      'getStudioOptions',
      'approved placements are artwork-scoped via /artworks/{slug}/compatible-garments, but this method takes no artwork (TMS-FBR-017).',
    );
  },
  listDrops() {
    return notImplemented(
      'listDrops',
      '/drops carries no tagline, pieceCount or soldOut (TMS-FBR-018).',
    );
  },
  getDrop() {
    return notImplemented(
      'getDrop',
      '/drops carries no tagline, pieceCount or soldOut (TMS-FBR-018).',
    );
  },
  listStories() {
    return notImplemented(
      'listStories',
      '/stories carries no category, readMinutes or shoppableCount (TMS-FBR-019).',
    );
  },
  getStory() {
    return notImplemented(
      'getStory',
      '/stories carries no category, readMinutes or shoppableCount (TMS-FBR-019).',
    );
  },
  getArtworkPassport() {
    return notImplemented('getArtworkPassport', 'the passport endpoint does not exist yet.');
  },
  getReviews() {
    return notImplemented('getReviews', 'the reviews endpoint does not exist yet.');
  },
  listCommunityPhotos() {
    return notImplemented('listCommunityPhotos', 'the community endpoint does not exist yet.');
  },
  listArtworkCommunityPhotos() {
    return notImplemented(
      'listArtworkCommunityPhotos',
      'the community endpoint does not exist yet.',
    );
  },
  getLoyalty() {
    return notImplemented('getLoyalty', 'the loyalty endpoint does not exist yet.');
  },
  getDeliveryOptions() {
    return notImplemented('getDeliveryOptions', 'delivery options/quotes do not exist yet.');
  },
};
