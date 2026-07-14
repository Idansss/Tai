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

## Request TMS-FBR-003 — Cart / promotion / totals

- Frontend task: F3 cart (`/cart`, cart drawer) and the interim checkout summary.
- Required endpoints (proposed): `POST /api/v1/cart/items` (add a configured line),
  `PATCH /api/v1/cart/items/{lineId}` (quantity), `DELETE /api/v1/cart/items/{lineId}`,
  `GET /api/v1/cart`, `POST /api/v1/cart/promotion` (apply/validate a code).
- Required request fields (add line): product/garment-variant id, artwork-version id, colour,
  size, placement id, scale preset, view, quantity; promotion apply: `code`.
- Required response fields: cart `id`, `items[]` (`lineId`, config snapshot, `unitPriceMinor`,
  `quantity`, `lineTotalMinor`, thumbnail), `subtotalMinor`, applied `promotion`
  (`code`, `label`, `discountMinor`), `currency`. **Delivery + tax are intentionally excluded
  here** — they belong to the checkout quote (server-authoritative per spec §"server is
  authoritative for … shipping … and totals").
- Reason: the cart currently runs on a client-only store (localStorage) with a **preview**
  subtotal and **mock** promotion codes (`STUDIO10`, `WELCOME`). Pricing, promotion validity and
  totals must move server-side before checkout is real.
- Blocking: no (F3 cart builds on the typed client store; swap to the API on delivery).
- Suggested fallback: keep `lib/cart.ts` pure helpers as the client model; replace the store's
  mutations with API calls and treat server totals as authoritative.

## Request TMS-FBR-004 — Checkout / delivery quote / order

- Frontend task: F3 checkout (`/checkout`) and order confirmation (`/checkout/success`).
- Required endpoints (proposed): `GET /api/v1/checkout/delivery-options` (methods + fees + ETAs
  for a destination), `POST /api/v1/checkout/quote` (authoritative subtotal, discount, delivery,
  tax, total for the current cart + address + method), `POST /api/v1/orders` (place order →
  returns order id/reference + payment intent for TMS-F3-003).
- Required request fields: quote — cart id/lines, delivery address (state/city), delivery method
  id, promotion code; place order — the quote id + contact + delivery + payment method.
- Required response fields: delivery options (`id`, `label`, `description`, `priceMinor`,
  `currency`, `eta`); quote (`subtotalMinor`, `discountMinor`, `deliveryMinor`, `taxMinor`,
  `totalMinor`, `currency`); order (`reference`, `status` per `OrderStatusSchema`, `totals`,
  snapshots of items/contact/delivery, `payment` handoff).
- Reason: the checkout currently computes a **preview** total client-side — delivery fees are mock
  (`getDeliveryOptions()`), **VAT is a mock 7.5%**, and "Place order" only snapshots the order to
  `localStorage` (`tms.lastOrder.v1`); no payment is taken. Tax, shipping and totals must be
  server-authoritative before checkout is real (spec §"server is authoritative for … tax,
  shipping, and totals"), and inventory reservation + payment intents are server concerns.
- Blocking: no (checkout builds on the typed mock + client store; swap to the API on delivery).
- Suggested fallback: keep `lib/checkout.ts` (validation + total formula) and `lib/order.ts` as
  the client model; replace the mock delivery source + local order snapshot with the endpoints and
  treat the server quote/order as authoritative. Pairs with TMS-F3-003 (payment states) and
  TMS-FBR-003 (cart).

_No further requests yet. Add here as F1+ surfaces need contracts._
