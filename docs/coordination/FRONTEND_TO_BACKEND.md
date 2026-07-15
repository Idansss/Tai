# Frontend to Backend

Claude Code records requested endpoints, fields, filters, sorting, errors, and delivery
priority here. Until an endpoint exists, the frontend uses a typed mock adapter against
`@tms/contracts` and the affected screen is flagged in FRONTEND_HANDOFF.

## Request TMS-FBR-001 — Catalogue read (artwork + versions)

- Frontend task: F1 artwork gallery/detail, homepage featured artwork.
- Required endpoint: `GET /api/v1/artworks` (list, filterable) and `GET /api/v1/artworks/{slug}`.
- Required method: GET.
- Required request fields: query — `cursor`, `limit` (per `PaginationQuerySchema`),
  `collection`, `theme`, `mood`, `colourFamily`, `garmentCompatibility`, `availability`,
  `limitedEdition`, `sort` (`newest`|`popular`).
- Required response fields (per artwork): `id`, `slug`, `title`, `collection`, `shortStory`,
  `availability`, `startingPrice`, `compatibleGarments[]`, `limitedEdition`, `imageUrl`,
  `versions[]` (immutable version id + preview). Detail adds `story`, `inspiration`,
  `processSketches[]`, `release`, `edition`, `recommendedColours[]`, `related[]`.
- Reason: artwork-first gallery and gallery-style detail pages are core F1 surfaces.
- Blocking: no (F0 uses mock adapter; F1 build proceeds on mock).
- Suggested fallback: typed `mockProvider` fixtures; swap to `apiProvider` on delivery.

## Request TMS-FBR-002 — Product / garment read

- Frontend task: F1 shop listing and product page (`/shop`, `/products/[slug]`).
- Required endpoints: `GET /api/v1/products` (list) and `GET /api/v1/products/{slug}`.
- Required method: GET.
- Required response fields (list): `id`, `slug`, `title`, `artworkSlug`, `artworkTitle`,
  `collection`, `garment`, `priceMinor`, `currency`, `availability`, `colourCount`.
- Required response fields (detail) add: `description`, `fabric`, `fit`, `printMethod`, `care`,
  `deliveryEstimate`, `returnSummary`, `colours[]` (`{ name, hex, available }`),
  `sizes[]` (`{ label, available }`). Ideally availability is a per-colour×size matrix so the UI
  can disable unavailable combinations precisely (frontend currently models size availability
  globally).
- Reason: shop and product-configuration surfaces (colour/size selection, stock state, price).
- Blocking: no (F1 uses typed `mockProvider`).
- Suggested fallback: typed `mockProvider` fixtures; swap to `apiProvider` on delivery. Prices
  and availability must come from the server and are authoritative at cart/checkout.

_No further requests yet. Add here as F1+ surfaces need contracts._
