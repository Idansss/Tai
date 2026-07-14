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

_No further requests yet. Add here as F1+ surfaces need contracts._
