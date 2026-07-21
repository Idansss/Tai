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
  /**
   * Null when the source cannot state it. ADR-015 puts price on the approved artwork and
   * garment pair, so the API's artwork response carries no price and no availability state.
   * Null means "not known here" and must render as absent, never as ₦0 or "in stock".
   */
  availability: Availability | null;
  startingPriceMinor: number | null;
  currency: string | null;
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

/**
 * Artwork Passport (TMS-F5-006) — authenticity & provenance for a specific
 * artwork *version*. The `versionId` is a deterministic, content-addressed id
 * (see `lib/passport.ts`): same content → same id, and it is meant to be
 * immutable for a given release. Today it is derived on the frontend from the
 * stable artwork fields; TMS-FBR-001 will make it server-authoritative and add
 * a real per-piece serial ledger + ownership record.
 */
export interface ProvenanceEvent {
  label: string;
  detail: string;
  /** A year or human date — textual, not machine-parsed. */
  date: string;
}

export interface ArtworkPassport {
  artworkSlug: string;
  title: string;
  collection: string;
  /** Immutable, content-addressed version id, e.g. "AP-1A2B-3C4D". */
  versionId: string;
  /** Human edition label, e.g. "Limited edition of 100" / "Open edition". */
  edition: string;
  /** Total run size for limited editions; null for open editions. */
  editionSize: number | null;
  /** Illustrative serial for the edition; null for open editions. Placeholder. */
  serialExample: string | null;
  /** When the artwork was released. */
  releasedOn: string;
  /** The studio/artist attribution that signs the passport. */
  issuedBy: string;
  /** Authenticity / provenance narrative, earliest first. */
  provenance: ProvenanceEvent[];
}

/**
 * Loyalty & referrals (TMS-F5-010). The tier is *derived* from points by the
 * pure helpers in `lib/loyalty.ts` (single source of truth), so the provider
 * returns raw points + the rewards catalogue + a referral code. All of it is
 * illustrative preview data — real earning, tiers, redemption, and referral
 * attribution are server-authoritative (TMS-FBR-008).
 */
export interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
}

export interface LoyaltyProfile {
  points: number;
  /** Lifetime points earned, for display. */
  lifetimePoints: number;
  /** ISO date the customer joined the programme. */
  memberSince: string;
  referralCode: string;
  /** What a successful referral gives, in plain words. */
  referralRewardText: string;
  rewards: LoyaltyReward[];
}

/**
 * Community gallery (TMS-F5-005) — customer photos of pieces in the wild. Every
 * photo carries a `status`; only `approved` photos are ever shown publicly. The
 * mock's public methods return approved photos only, and the pure helpers in
 * `lib/community.ts` enforce that filter. Real UGC intake + moderation is
 * backend (TMS-FBR-008); submit-a-photo is preview-only here (no real upload).
 */
export type ModerationStatus = 'approved' | 'pending' | 'rejected';

export interface CommunityPhoto {
  id: string;
  artworkSlug: string;
  artworkTitle: string;
  /** Display handle, e.g. "@ada.wears". */
  handle: string;
  caption: string;
  status: ModerationStatus;
  /** ISO timestamp. */
  createdAt: string;
}

/**
 * Reviews & ratings (TMS-F5-004). Reviews attach to a product or an artwork by
 * slug. `verifiedPurchase` is a server-vouched flag (a real order backs the
 * review) — the client never sets it. Aggregate stats are derived by the pure
 * helpers in `lib/reviews.ts`. Read + write + moderation are backend
 * (TMS-FBR-008); today the mock seeds a deterministic set and writes are
 * preview-only.
 */
export type ReviewTargetType = 'product' | 'artwork';

export interface Review {
  id: string;
  /** Whole-star rating, 1–5. */
  rating: number;
  title: string;
  body: string;
  author: string;
  /** ISO timestamp. */
  createdAt: string;
  verifiedPurchase: boolean;
}

export interface ReviewStats {
  /** Mean rating (0 when there are no reviews). */
  average: number;
  count: number;
  /** Number of reviews at each whole-star rating, keyed 1–5. */
  distribution: Record<number, number>;
}

export interface ReviewCollection {
  stats: ReviewStats;
  /** Reviews, newest first. */
  items: Review[];
}

/**
 * Shoppable editorial stories (TMS-F5-007). A story is an editorial article
 * whose "scene" blocks carry positioned **hotspots** that link into the
 * catalogue (an artwork, a product, a collection, or the Design Studio). The
 * hotspot geometry (x/y percentages) is authored data; the href + action label
 * for each target are derived by the pure helpers in `lib/stories.ts`. Content
 * is mock/editorial today; a real CMS feed can map onto these shapes later.
 */
export type StoryHotspotTarget =
  | { kind: 'artwork'; slug: string; label: string }
  | { kind: 'product'; slug: string; label: string; priceMinor: number; currency: string }
  | { kind: 'collection'; slug: string; label: string }
  | { kind: 'studio'; label: string };

export interface StoryHotspot {
  id: string;
  /** Centre of the hotspot on the scene, as percentages (0–100). */
  x: number;
  y: number;
  /** Short caption shown alongside the linked item. */
  caption: string;
  target: StoryHotspotTarget;
}

export interface StoryScene {
  id: string;
  /** Alt/label for the scene placeholder image. */
  caption: string;
  hotspots: StoryHotspot[];
}

export type StoryBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'scene'; scene: StoryScene }
  /**
   * A flat shoppable call-to-action. The API's `SHOPPABLE` blocks (TMS-FBR-019) carry a link
   * target and a label but no scene image or hotspot geometry — that imagery is the un-shipped
   * media work (TMS-B2-004/B3-003) — so they render as an inline "shop this" link rather than a
   * positioned `scene`. The mock adapter still authors rich `scene` blocks; both kinds render.
   */
  | { kind: 'shoppable'; href: string; label: string };

export interface StorySummary {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  readMinutes: number;
  /** ISO date the story was published. */
  publishedOn: string;
  /** Count of shoppable (artwork/product) hotspots across the story. */
  shoppableCount: number;
  /**
   * Cover drawing for the index tile, derived from the story's first artwork hotspot. Optional:
   * a story with no artwork hotspot (or whose art has no plate yet) falls back to the dark
   * editorial tile, and the API provider does not carry it yet (TMS-FBR-019).
   */
  coverImage?: string | null;
}

export interface StoryDetail extends StorySummary {
  intro: string;
  blocks: StoryBlock[];
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
  /**
   * Optional product photograph (flat-lay / worn shot). When set, shop tiles and the product
   * page prefer it over composing a garment mockup from the artwork plate alone.
   */
  image?: string | null;
}

/**
 * The Design Studio's option model, shaped by ADR-013: approved placements are the only design
 * geometry. Everything here is something an administrator approved for one exact artwork version
 * on one exact garment. The customer picks from these; they never author geometry.
 *
 * The nesting is not cosmetic, it mirrors the contract:
 * - placements are approved per artwork+garment pair (ArtworkGarmentCompatibility), not globally;
 * - scale presets belong to a *placement* (GarmentScalePreset.placementId), so changing placement
 *   changes the available scales;
 * - colours/sizes/variants belong to a garment template.
 */
export interface StudioScalePreset {
  /**
   * The approved preset's slug. This is what DesignConfigurationInput.scalePreset takes — note
   * it is a slug while the sibling ids are UUIDs, and a cart line reads it back as
   * `scalePresetId` (TMS-FBR-017).
   */
  slug: string;
  label: string;
  /** Rendered artwork width as a percentage of the garment. Derived; render-only. */
  widthPct: number;
}

export interface StudioPlacement {
  /** The approved placement id. The only placement value ever sent to the server. */
  id: string;
  label: string;
  area: 'front' | 'back';
  /**
   * Centre position of the print as a percentage of the garment. Administrator-approved and
   * render-only: the customer cannot move it (ADR-013), we only draw it.
   */
  x: number;
  y: number;
  /** The approved print size in millimetres, for an honest "what you get" note. */
  printWidthMm: number;
  printHeightMm: number;
  /** Scale presets approved for THIS placement. */
  scalePresets: StudioScalePreset[];
}

/** One buyable garment variant: the colour+size pair the server knows by id. */
export interface StudioVariant {
  /** garmentVariantId — half of the approved tuple. */
  id: string;
  colour: string;
  size: string;
}

export interface StudioGarment {
  /** Garment template slug, used in the shareable URL. */
  slug: string;
  title: string;
  /** The exact immutable artwork version this garment was approved against. */
  artworkVersionId: string;
  colours: ProductColour[];
  sizes: string[];
  variants: StudioVariant[];
  placements: StudioPlacement[];
}

export interface StudioOptions {
  /** Garments approved for this artwork. Empty means the artwork has no approved canvas. */
  garments: StudioGarment[];
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
  /** Authenticity/provenance passport for an artwork version, or null if unknown. */
  getArtworkPassport(slug: string): Promise<ArtworkPassport | null>;
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
  /**
   * The garments, colours, sizes and approved placements an administrator has approved for one
   * artwork. Artwork-scoped because approval is per artwork+garment pair (ADR-013): there is no
   * global set of placements to offer.
   */
  getStudioOptions(artworkSlug: string): Promise<StudioOptions>;
  /** Available delivery methods with fees + ETAs for checkout. */
  getDeliveryOptions(): Promise<DeliveryOption[]>;
  /** Limited drops for the drops index, newest release first (TMS-F5-001). */
  listDrops(): Promise<DropSummary[]>;
  /** A drop and its released artworks, or null if the slug is unknown. */
  getDrop(slug: string): Promise<DropDetail | null>;
  /** Shoppable editorial stories for the journal index, newest first (TMS-F5-007). */
  listStories(): Promise<StorySummary[]>;
  /** A story with its editorial blocks + hotspots, or null if the slug is unknown. */
  getStory(slug: string): Promise<StoryDetail | null>;
  /** Reviews + aggregate stats for a product or artwork (empty when none). */
  getReviews(targetType: ReviewTargetType, slug: string): Promise<ReviewCollection>;
  /** Approved community photos for the gallery, newest first (TMS-F5-005). */
  listCommunityPhotos(): Promise<CommunityPhoto[]>;
  /** Approved community photos for a single artwork, newest first. */
  listArtworkCommunityPhotos(slug: string): Promise<CommunityPhoto[]>;
  /** Loyalty & referral profile for a signed-in customer (TMS-F5-010). */
  getLoyalty(email: string): Promise<LoyaltyProfile>;
}
