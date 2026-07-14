import type { CursorPage } from '@tms/contracts';

/**
 * Storefront view models. These are frontend-facing shapes that the mock adapter
 * produces today and the API adapter will map real responses into once Codex
 * publishes the catalogue contract (see docs/coordination/FRONTEND_TO_BACKEND.md,
 * request TMS-FBR-001). Shared envelope/pagination/enum types come from @tms/contracts.
 */

export type Availability = 'available' | 'limited' | 'sold_out';

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

export interface ListArtworksParams {
  cursor?: string;
  limit?: number;
  collection?: string;
  availability?: Availability;
  sort?: 'newest' | 'popular';
}

export interface StorefrontDataProvider {
  listArtworks(params?: ListArtworksParams): Promise<CursorPage<ArtworkSummary>>;
  getArtwork(slug: string): Promise<ArtworkDetail | null>;
}
