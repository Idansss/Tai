import { apiProvider } from './api';
import { mockProvider } from './mock';
import type { StorefrontDataProvider } from './types';

/**
 * Which data source backs each domain.
 *
 * DATA_SOURCE used to be one all-or-nothing switch, which no longer fits: the backend has
 * shipped artworks, catalogue, garments, designs and cart, but reviews, community photos,
 * loyalty, the passport, delivery and orders do not exist yet. A single flag would force a
 * choice between "throw on half the screens" and "mock everything".
 *
 * The rejected alternative was a per-method fallback inside apiProvider (try the API, fall
 * back to the mock). It reads as convenient and behaves as a trap: a real endpoint going
 * down would silently serve plausible fake data, so an outage becomes invisible in exactly
 * the domains we most need to trust. Failures must stay loud.
 *
 * So the source is chosen per domain, explicitly, here. A domain with no backend is pinned
 * to `mock` and no flag can point it at the API, because there is nothing to point it at.
 * When the backend publishes one, flip that one entry to `api` and delete its row from the
 * mock-backed table in docs/handoffs/FRONTEND_HANDOFF.md.
 *
 * See docs/handoffs/FRONTEND_HANDOFF.md ("Data source policy") for the full rationale.
 */
export type DataDomain =
  | 'artworks'
  | 'collections'
  | 'drops'
  | 'stories'
  | 'studio'
  | 'products'
  | 'passport'
  | 'reviews'
  | 'community'
  | 'loyalty'
  | 'delivery';

type DomainSource = 'api' | 'mock';

/**
 * Domains the backend has actually merged AND whose view model the API can fill. Only
 * these may be served by `api`.
 *
 * `drops` and `stories` are now `true`: TMS-FBR-018/019 added the fields their view models needed
 * (a drop's tagline/earlyAccessAt/soldOut/pieceCount, a story's category/readMinutes/
 * shoppableCount), so the api adapter fills them from the real read model — a drop's pieces and
 * collection are resolved from /artworks?drop=, and a story's SHOPPABLE blocks render as inline
 * links since the server carries no hotspot geometry. Cover images stay a client-side fallback
 * (no server cover field; `thumbnailUrl` still null).
 *
 * `studio` is still false: getStudioOptions() takes no artwork, while
 * /artworks/{slug}/compatible-garments is artwork-scoped. Flipping it on today would mean
 * inventing data. It is filed in docs/coordination/FRONTEND_TO_BACKEND.md; flip the entry when
 * its gap closes.
 */
const API_CAPABLE_DOMAINS = {
  artworks: true,
  collections: true,
  drops: true,
  stories: true,
  studio: false,
  // `product` is a storefront composition (an artwork on a garment), not a backend
  // resource: there is no /products endpoint. Deriving it from /artworks plus
  // /artworks/{slug}/compatible-garments is TMS-FBR-010 in FRONTEND_TO_BACKEND.md.
  products: false,
  passport: false,
  reviews: false,
  community: false,
  loyalty: false,
  delivery: false,
} as const satisfies Record<DataDomain, boolean>;

/**
 * Resolve one domain.
 *
 * `api` stays opt-in via DATA_SOURCE=api rather than becoming the default, for a concrete
 * reason: the catalogue routes are statically generated, so `pnpm build` fetches. A default
 * of `api` would make every build and every CI run depend on a reachable API and fail
 * without one. Mock remains the zero-dependency default; deployments that have an API set
 * DATA_SOURCE=api. A domain with no backend ignores the flag entirely.
 */
function sourceFor(domain: DataDomain): DomainSource {
  if (!API_CAPABLE_DOMAINS[domain]) return 'mock';
  return process.env.DATA_SOURCE === 'api' ? 'api' : 'mock';
}

function pick(domain: DataDomain): StorefrontDataProvider {
  return sourceFor(domain) === 'api' ? apiProvider : mockProvider;
}

/** The composed provider. Each method is bound to whichever adapter owns its domain. */
export const dataProvider: StorefrontDataProvider = {
  listArtworks: (...args) => pick('artworks').listArtworks(...args),
  getArtwork: (...args) => pick('artworks').getArtwork(...args),
  searchArtworks: (...args) => pick('artworks').searchArtworks(...args),
  listCollections: (...args) => pick('collections').listCollections(...args),
  listCollectionSummaries: (...args) => pick('collections').listCollectionSummaries(...args),
  getCollection: (...args) => pick('collections').getCollection(...args),
  listDrops: (...args) => pick('drops').listDrops(...args),
  getDrop: (...args) => pick('drops').getDrop(...args),
  listStories: (...args) => pick('stories').listStories(...args),
  getStory: (...args) => pick('stories').getStory(...args),
  getStudioOptions: (...args) => pick('studio').getStudioOptions(...args),
  listProducts: (...args) => pick('products').listProducts(...args),
  getProduct: (...args) => pick('products').getProduct(...args),
  getArtworkPassport: (...args) => pick('passport').getArtworkPassport(...args),
  getReviews: (...args) => pick('reviews').getReviews(...args),
  listCommunityPhotos: (...args) => pick('community').listCommunityPhotos(...args),
  listArtworkCommunityPhotos: (...args) => pick('community').listArtworkCommunityPhotos(...args),
  getLoyalty: (...args) => pick('loyalty').getLoyalty(...args),
  getDeliveryOptions: (...args) => pick('delivery').getDeliveryOptions(...args),
};

/** Which domains are mock-backed right now. Powers the in-app honesty banner. */
export function mockBackedDomains(): DataDomain[] {
  return (Object.keys(API_CAPABLE_DOMAINS) as DataDomain[]).filter(
    (domain) => sourceFor(domain) === 'mock',
  );
}

export * from './types';
