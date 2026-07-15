import type { CursorPage } from '@tms/contracts';

/**
 * Storefront view models. These are frontend-facing shapes that the mock adapter
 * produces today and the API adapter will map real responses into once Codex
 * publishes the catalogue contract (see docs/coordination/FRONTEND_TO_BACKEND.md,
 * request TMS-FBR-001). Shared envelope/pagination/enum types come from @tms/contracts.
 */

export type Availability = 'available' | 'limited' | 'sold_out';

export type ArtworkSort = 'newest' | 'popular';

export const ARTWORK_SORTS: ArtworkSort[] = ['newest', 'popular'];
export const AVAILABILITIES: Availability[] = ['available', 'limited', 'sold_out'];

export interface ArtworkSummary {
  id: string;
  slug: string;
  title: string;
  collection: string;
  shortStory: string;
  availability: Availability;
  startingPriceMinor: number;
  currency: string;
  compatibleGarments: string[];
  limitedEdition: boolean;
}

export interface ArtworkDetail extends ArtworkSummary {
  story: string;
  inspiration: string;
  edition?: string;
  release?: string;
  related: ArtworkSummary[];
}

export interface CollectionSummary {
  slug: string;
  name: string;
  description: string;
  artworkCount: number;
}

export interface CollectionDetail extends CollectionSummary {
  artworks: ArtworkSummary[];
}

export interface ProductColour {
  name: string;
  hex: string;
  available: boolean;
}

export interface ProductSize {
  label: string;
  available: boolean;
}

export interface ProductSummary {
  id: string;
  slug: string;
  title: string;
  artworkSlug: string;
  artworkTitle: string;
  collection: string;
  garment: string;
  priceMinor: number;
  currency: string;
  availability: Availability;
  colourCount: number;
}

export interface StudioPlacement {
  id: string;
  label: string;
  area: 'front' | 'back';
  /** Centre position of the artwork on the garment, as a percentage. */
  x: number;
  y: number;
}

export interface StudioScalePreset {
  id: string;
  label: string;
  /** Artwork width as a percentage of the garment width. */
  widthPct: number;
}

export interface StudioOptions {
  colours: ProductColour[];
  sizes: string[];
  placements: StudioPlacement[];
  scalePresets: StudioScalePreset[];
}

export interface DeliveryOption {
  id: string;
  label: string;
  description: string;
  /** Delivery fee in minor units. Server-authoritative at checkout later. */
  priceMinor: number;
  currency: string;
  /** Human ETA, e.g. "2–4 working days". */
  eta: string;
}

export interface ProductDetail extends ProductSummary {
  description: string;
  fabric: string;
  fit: string;
  printMethod: string;
  care: string;
  deliveryEstimate: string;
  returnSummary: string;
  colours: ProductColour[];
  sizes: ProductSize[];
}

export interface ListArtworksParams {
  cursor?: string;
  limit?: number;
  collection?: string;
  availability?: Availability;
  sort?: ArtworkSort;
}

/**
 * Limited drops (TMS-F5-001). A drop is a timed release of a set of artworks.
 * Timestamps are ISO strings; the *status* is derived from them relative to the
 * current time by the pure helpers in `lib/drops.ts` (never trust a status the
 * client could forge). `earlyAccessAt`/`endsAt` are null when there is no early
 * window / the drop is open-ended. The mock adapter generates timestamps
 * relative to "now" so the countdowns are live in the preview; the real API
 * (TMS-FBR-008) will provide server-authoritative absolute timestamps.
 */
export interface DropSummary {
  slug: string;
  title: string;
  tagline: string;
  collection: string;
  earlyAccessAt: string | null;
  releaseAt: string;
  endsAt: string | null;
  pieceCount: number;
  /** Server-authoritative sell-through flag; overrides the time window. */
  soldOut: boolean;
}

export interface DropDetail extends DropSummary {
  story: string;
  /** The artworks released in this drop. */
  artworks: ArtworkSummary[];
}

export interface StorefrontDataProvider {
  listArtworks(params?: ListArtworksParams): Promise<CursorPage<ArtworkSummary>>;
  getArtwork(slug: string): Promise<ArtworkDetail | null>;
  /** Distinct collection names available for filtering. */
  listCollections(): Promise<string[]>;
  /** Free-text search across the catalogue. Empty query returns no results. */
  searchArtworks(query: string, limit?: number): Promise<ArtworkSummary[]>;
  /** Collections for the collections index. */
  listCollectionSummaries(): Promise<CollectionSummary[]>;
  /** A collection and its artworks, or null if the slug is unknown. */
  getCollection(slug: string): Promise<CollectionDetail | null>;
  /** Purchasable products (artwork applied to a garment) for the shop index. */
  listProducts(): Promise<ProductSummary[]>;
  /** A product and its configurable options, or null if the slug is unknown. */
  getProduct(slug: string): Promise<ProductDetail | null>;
  /** Approved Design Studio configuration options (colours, sizes, placements, scales). */
  getStudioOptions(): Promise<StudioOptions>;
  /** Available delivery methods with fees + ETAs for checkout. */
  getDeliveryOptions(): Promise<DeliveryOption[]>;
  /** Limited drops for the drops index, newest release first (TMS-F5-001). */
  listDrops(): Promise<DropSummary[]>;
  /** A drop and its released artworks, or null if the slug is unknown. */
  getDrop(slug: string): Promise<DropDetail | null>;
}
