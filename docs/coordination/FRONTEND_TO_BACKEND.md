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
- **SSG note (TMS-F1-DEF-001 fix):** `/artworks/[slug]` (and `/collections/[slug]`,
  `/products/[slug]` under TMS-FBR-002) now enumerate valid slugs via `generateStaticParams` +
  `dynamicParams = false` so unknown slugs 404 correctly. When these read endpoints land, the
  build will call the **list** endpoint to enumerate slugs. If the catalogue must change without a
  redeploy, we'll move to ISR (`dynamicParams = true` + `revalidate`, or on-demand revalidation) —
  so the list endpoint should be buildtime-callable and, ideally, support a webhook/tag for
  on-demand revalidation on publish/unpublish.

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
- **Payment states (TMS-F3-003, delivered):** the frontend renders processing / success / pending
  / failure at `/checkout/payment` and a status-aware confirmation at `/checkout/success`, driven
  by a **mock** resolver (`lib/payment.ts`) that maps to the `OrderStatus`/`PaymentStatus` enums
  from `@tms/contracts`. It needs: a payment-intent/redirect from `POST /api/v1/orders`, a way to
  observe the resolved status (webhook-backed `GET /api/v1/orders/{ref}` or a return URL with a
  verifiable token — never trust a client `?outcome=` param), and idempotent retry. No money is
  moved client-side today.

## Request TMS-FBR-005 — Auth / session / customer account

- Frontend task: F3 auth (`/login`, `/register`), account (`/account`), and checkout prefill.
- Required endpoints (proposed): `POST /api/v1/auth/register`, `POST /api/v1/auth/login`,
  `POST /api/v1/auth/logout`, `GET /api/v1/auth/session` (current user), plus password reset later.
- Required request fields: register — `name`, `email`, `password`; login — `email`, `password`.
- Required response fields: session `user` (`id`, `name`, `email`), set via an **httpOnly session
  cookie** (never a client-stored token); typed errors for duplicate email / invalid credentials.
- Reason: the storefront currently runs a **mock session** — accounts are a local `{email,name}`
  list in `localStorage` (`tms.accounts.v1` / `tms.session.v1`) with **no passwords stored and no
  real authentication** (login only checks the email exists). This must move to real, secure
  server auth before launch. The account page + checkout prefill consume `useAuth().user`.
- Blocking: no (auth builds on the mock `AuthProvider`; swap `register`/`login`/`logout`/session
  hydration to the API on delivery).
- Suggested fallback: keep `lib/auth.ts` validators + `AuthProvider` shape; replace its storage
  calls with the endpoints and hydrate the session from the cookie-backed `GET /session`. Feeds
  TMS-F3-005 (account: orders, saved designs, wishlist).

### TMS-FBR-005 addendum — account data (orders, saved designs, wishlist) [TMS-F3-005]

The account build-out (`/account`, `/account/orders`, `/account/orders/[reference]`,
`/account/saved-designs`, `/account/wishlist`) currently runs on **client localStorage keyed by
email**. It needs, on top of the auth endpoints above:

- **Order history + detail:** `GET /api/v1/orders` (the signed-in customer's orders — reference,
  placed date, item count, `status` per `OrderStatusSchema`, totals, currency) and
  `GET /api/v1/orders/{reference}` (full order: items snapshot, contact, delivery, totals, and a
  status/shipping timeline). Belongs with the orders API in **TMS-FBR-004**. The UI maps
  `OrderStatus` → **customer-facing** copy + a fulfilment timeline in `lib/order-status.ts` and
  **never renders raw provider codes** (spec §17); the server should still drive the real status.
- **Saved designs:** `GET/POST/DELETE /api/v1/account/saved-designs` storing a
  `DesignConfigurationInput` (+ display metadata: artwork title, colour, price) so a customer can
  reopen a design in the studio. Today `lib/account.ts` persists these per email.
- **Wishlist:** `GET /api/v1/account/wishlist`, `POST`/`DELETE` by product slug/id. Today a
  per-email localStorage list via `WishlistProvider`.
- Reason: these are per-customer account resources; they must be server-owned + auth-scoped (and,
  once cookie sessions land, persist across devices) before launch.
- Blocking: no (all three build on the typed client stores; swap to the API on delivery).
- Suggested fallback: keep the `lib/account.ts` transforms + `lib/order-status.ts` mapping as the
  view model; replace the storage wrappers with the endpoints. Note the current model keys order
  history by **contact email** so guest orders reconcile on later sign-in — the server should do
  the equivalent association.

## Request TMS-FBR-006 — Staff auth + RBAC (admin) [TMS-F4-001]

- Frontend task: F4 admin console sign-in + route protection (`apps/admin`).
- Required endpoints (proposed): `POST /api/v1/admin/auth/login`, `POST /api/v1/admin/auth/logout`,
  `GET /api/v1/admin/auth/session` (current staff user + roles/permissions).
- Required response fields: staff `user` (`id`, `name`, `email`, `roles[]`/`permissions[]`), set via
  an **httpOnly session cookie** (never a client-stored token); typed error for invalid credentials.
- Reason: the admin app currently runs a **mock staff session** — any well-formed sign-in starts a
  local `{ email, name }` demo session in `localStorage` (`tms.admin.session.v1`), with **no real
  authentication, roles or passwords**. The `AdminShell` gate simply redirects when no session
  exists. Real staff auth + **role-based access control** must gate the console (and per-section
  permissions) before launch.
- Blocking: no (admin builds on the mock `AdminAuthProvider`; swap `login`/`logout`/session
  hydration to the API on delivery).
- Suggested fallback: keep `lib/admin-auth.ts` validators + `AdminAuthProvider` shape; replace its
  storage calls with the endpoints and hydrate from the cookie-backed `GET /session`; enforce
  role/permission checks per route/section.

## Request TMS-FBR-007 — Admin read endpoints (dashboard + operations) [TMS-F4-001+]

- Frontend task: F4 admin dashboard (delivered) and the operational sections (orders, artworks,
  garments, production, customers, errors — F4-002…006).
- Required endpoints (proposed, dashboard first): `GET /api/v1/admin/dashboard` returning the
  operational summary — headline metrics (revenue, paid orders, AOV, pending/failed payments,
  low-stock count), operational queue counts (production, quality check, ready for dispatch,
  delivery exceptions), ranked lists (top artwork/garment/colours), recent orders (reference,
  customer, `status` per `OrderStatusSchema`, total), and an open-issues count. Later sections need
  admin list/detail endpoints for orders, artworks, garments, production jobs, customers and the
  error centre (each defined as its F4 task lands). **Orders (F4-002, delivered):** the admin lists
  orders (`GET /api/v1/admin/orders` with search/status/pagination) and opens an order
  (`GET /api/v1/admin/orders/{reference}` — items + per-line production state, payment, shipment,
  customer, delivery, totals, status timeline). It also needs **fulfilment actions** (print asset,
  packing slip, notification resend, refund, return) as real endpoints and **internal notes**
  (`GET/POST/DELETE /api/v1/admin/orders/{reference}/notes`); today the actions are honest
  no-op placeholders and notes persist in `localStorage`. **Artworks (F4-003, delivered):** the
  admin lists/opens artworks (`GET /api/v1/admin/artworks`, `GET /api/v1/admin/artworks/{id}` —
  story, tags, SEO, edition, versions with processing/validation state, mockups with approval state,
  garment/placement compatibility) and needs the **catalogue write** surface: upload
  (`POST /api/v1/admin/artworks` with async processing + validation results), mockup generation +
  approval (`PATCH …/mockups/{id}`), and the publishing lifecycle
  (`POST …/{id}/publish|schedule|archive|unpublish`). Today upload is a simulated client flow (no
  file stored), and lifecycle + approval changes are local state only. **Garments (F4-004,
  delivered):** the admin lists/opens garments (`GET /api/v1/admin/garments` with search/status
  filter, `GET /api/v1/admin/garments/{id}` — template, fabric/fit/care, front/back media, colours
  with per-colourway availability, sizes + a body-measurement size chart, print-safe areas, placement
  rules, price, and a colour×size **inventory** matrix with on-hand stock). It needs the **catalogue
  write + inventory** surface: garment create/edit (metadata, colours, sizes, size chart, print areas,
  placement rules, price, media upload), the publishing lifecycle
  (`POST …/{id}/activate|archive|restore` + move-to-draft), per-colourway availability toggles, and
  **stock adjustments** (`PATCH …/{id}/variants/{colourId}/{size}` or a bulk inventory endpoint).
  Today colours/sizes/media are read-only samples (no real asset store), and stock edits, colour
  availability toggles and lifecycle changes are local state only (honest "not saved" notices). The
  per-colour×size availability should also feed the storefront product page (pairs with
  **TMS-FBR-002**, which currently models size availability globally). **Production / QC / fulfilment
  (F4-005, delivered):** the admin production board lists active jobs
  (`GET /api/v1/admin/production` with a `stage` filter — reference, customer, placed date, order
  status/stage, per-line garment + print state, shipping) and drives **stage transitions** through the
  audited order state machine (spec §"Operations"): move to production, start printing, send to QC, **QC
  pass** / **reprint**, book & dispatch, mark delivered, and **flag / retry delivery exception** — as
  real endpoints (e.g. `POST /api/v1/admin/orders/{reference}/transitions` with `{ to, reason }`), each
  recording **actor, reason, correlation ID and provider event**. It also needs **print-file (production
  asset) access** and **per-line QC results** (today the whole order moves as one stage), plus packing
  slips / carrier booking. Today jobs are derived from the sample order dataset and every transition is
  local state only (honest "not saved" notices) — no state machine, no audit trail, no production
  assets. The board reuses the shared `OrderStatus` enum so the mock and a real backend agree on stages.
  **Error centre + customers + analytics (F4-006, delivered):** three read surfaces. **Error centre** —
  `GET /api/v1/admin/errors` (integration failures with `source`/`resolution` filters) returning
  **safe** entries only: a correlation ID, a human summary, severity, resolution state, affected order
  and retryability — **never stack traces, payloads or secrets** (spec §18); plus resolution actions
  (retry / investigate / resolve / ignore / reopen) as audited ops endpoints. **Customers** —
  `GET /api/v1/admin/customers` (search + status) and `GET /api/v1/admin/customers/{id}` (contact, order
  history, lifetime value, account status, saved-designs count); today these are **derived from the
  order dataset by contact email** and saved-designs is representative (needs the account API,
  TMS-FBR-005). **Analytics** — `GET /api/v1/admin/analytics` (date-range KPIs, a daily orders/revenue
  series, order-status mix, top artwork/garments); today computed client-side from the sample orders
  over a fixed 14-day window. All three are read-only mock derivations with local-only actions until the
  endpoints land.
- Required response fields: money in **minor units** + currency (formatted client-side); statuses
  as the shared `@tms/contracts` enums so the admin can present readable labels
  (`formatOrderStatus`) without inventing values.
- Reason: the admin dashboard currently renders **representative sample data** from a typed mock
  adapter (`apps/admin/lib/data`) — nothing reflects real operations. All admin read surfaces must
  move server-side, permission-scoped (TMS-FBR-006).
- Blocking: no (admin builds on the typed mock provider; swap `adminDataProvider` to the API
  adapter on delivery).
- Suggested fallback: keep the `AdminDataProvider` interface + view-model shapes; replace
  `mockAdminProvider` with `apiProvider` (env switch already wired). The error centre must **never**
  surface stack traces or secrets (spec §18) — expose correlation IDs + resolution state only.

## Request TMS-FBR-008 — Limited drops (growth) [TMS-F5-001]

- Frontend task: F5 drops surface (`/drops` index + `/drops/{slug}` detail), live countdowns,
  early-access/membership gating, and (next) the waitlist/back-in-stock signup (TMS-F5-002).
- Required endpoints (proposed): `GET /api/v1/drops` (list) and `GET /api/v1/drops/{slug}` (detail
  with its released artworks). Later, for early access + waitlist: `POST /api/v1/drops/{slug}/waitlist`
  (join) and a membership/early-access check on the session.
- Required response fields (per drop): `slug`, `title`, `tagline`, `collection`, `earlyAccessAt`
  (nullable ISO), `releaseAt` (ISO), `endsAt` (nullable ISO), `pieceCount`, `soldOut`. Detail adds
  `story` and `artworks[]` (the released `ArtworkSummary`s). **Timestamps must be absolute,
  server-authoritative UTC** — the frontend derives `upcoming/early_access/live/ended/sold_out`
  from them in `lib/drops.ts` and **never trusts a client-supplied status**; `soldOut` (and real
  inventory) is server-owned.
- Reason: the drops surface currently runs on the typed mock provider (`listDrops`/`getDrop`) with
  timestamps generated **relative to now** so the preview countdowns stay live. Real drops need a
  server-authoritative timeline + inventory, and the early-access gate + waitlist are UI-only today
  (no membership tier, no notify) — honest "preview" notices are shown.
- Blocking: no (drops build on the typed mock; swap `apiProvider` on delivery).
- Suggested fallback: keep `lib/drops.ts` (pure status/countdown/sort) + the `DropSummary`/`DropDetail`
  shapes as the view model; replace `listDrops`/`getDrop` with the endpoints. Because these pages are
  `force-dynamic` (time-sensitive), no build-time enumeration is needed. Membership/early-access
  enforcement + the waitlist/notify endpoint pair with TMS-F5-002.

_No further requests yet. Add here as F1+ surfaces need contracts._
