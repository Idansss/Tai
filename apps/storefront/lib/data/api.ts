import type {
  Artwork,
  ArtworkGarmentCompatibility,
  CatalogueEntry,
  CursorPage,
  GarmentPlacement,
} from '@tms/contracts';

import { apiFetch, apiFetchOrNull } from './http';
import type {
  ArtworkDetail,
  ArtworkSummary,
  CollectionDetail,
  CollectionSummary,
  ListArtworksParams,
  StorefrontDataProvider,
  StudioGarment,
  StudioOptions,
  StudioPlacement,
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

/**
 * The Studio preview only draws a front and a back. Placements approved for a LEFT/RIGHT view
 * have nowhere to render, so they are dropped rather than mislabelled onto the front.
 */
function toStudioArea(view: GarmentPlacement['view']): 'front' | 'back' | null {
  if (view === 'FRONT') return 'front';
  if (view === 'BACK') return 'back';
  return null;
}

/**
 * Map an approved placement. Permille is the contract's unit (0–999 across the canvas); the
 * preview works in percentages, and the placement's own approved box is the reference for a
 * scale preset, so `scalePercent` resolves against the placement width rather than the garment.
 */
function toStudioPlacement(placement: GarmentPlacement): StudioPlacement | null {
  const area = toStudioArea(placement.view);
  if (!area) return null;
  const widthPct = placement.widthPermille / 10;
  const heightPct = placement.heightPermille / 10;
  return {
    id: placement.id,
    label: placement.name,
    area,
    // The contract gives the box's top-left corner; the preview centres the print on it.
    x: placement.xPermille / 10 + widthPct / 2,
    y: placement.yPermille / 10 + heightPct / 2,
    printWidthMm: placement.printWidthMm,
    printHeightMm: placement.printHeightMm,
    scalePresets: placement.scalePresets
      .filter((preset) => preset.status === 'PUBLISHED')
      .sort((a, b) => a.position - b.position)
      .map((preset) => ({
        slug: preset.slug,
        label: preset.name,
        widthPct: (widthPct * preset.scalePercent) / 100,
      })),
  };
}

function toStudioGarment(compatibility: ArtworkGarmentCompatibility): StudioGarment | null {
  const template = compatibility.template;
  // Only the placements approved for THIS artwork+garment pair, never the template's full set.
  const placements = compatibility.placements
    .map((entry) => toStudioPlacement(entry.placement))
    .filter((placement): placement is StudioPlacement => placement !== null)
    .filter((placement) => placement.scalePresets.length > 0);
  if (placements.length === 0) return null;

  const variants = template.variants
    .filter((variant) => variant.status === 'PUBLISHED')
    .map((variant) => {
      const colour = template.colours.find((entry) => entry.id === variant.colourId);
      const size = template.sizes.find((entry) => entry.id === variant.sizeId);
      return colour && size ? { id: variant.id, colour: colour.name, size: size.label } : null;
    })
    .filter((variant): variant is NonNullable<typeof variant> => variant !== null);
  if (variants.length === 0) return null;

  // Offer only colours and sizes that a buyable variant actually exists for.
  const colourNames = new Set(variants.map((variant) => variant.colour));
  const sizeLabels = new Set(variants.map((variant) => variant.size));
  return {
    slug: template.slug,
    title: template.title,
    artworkVersionId: compatibility.artworkVersionId,
    colours: template.colours
      .filter((colour) => colourNames.has(colour.name))
      .map((colour) => ({ name: colour.name, hex: colour.hex, available: true })),
    sizes: template.sizes.filter((size) => sizeLabels.has(size.label)).map((size) => size.label),
    variants,
    placements,
  };
}

export const apiProvider: StorefrontDataProvider = {
  async getStudioOptions(artworkSlug: string): Promise<StudioOptions> {
    const compatibilities = await apiFetch<ArtworkGarmentCompatibility[]>(
      `/api/v1/artworks/${encodeURIComponent(artworkSlug)}/compatible-garments`,
    );
    const garments = compatibilities
      // Defence in depth: the endpoint returns approved pairs, but an unapproved canvas must
      // never reach the picker (ADR-013).
      .filter((compatibility) => compatibility.status === 'APPROVED')
      .map(toStudioGarment)
      .filter((garment): garment is StudioGarment => garment !== null);
    return { garments };
  },

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
