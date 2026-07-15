# Frontend Handoff

## Current frontend phase

**F0–F4 all Verified AND MERGED TO `main`** (2026-07-15). The F0→F4 PR stack (#4→#5→#6→#7→#8)
was merged **bottom-up with merge commits** and all five phase branches deleted; `pnpm check`
re-run **green on the integrated `main`** (HEAD `e919e7e`; 13/13 build tasks, all unit tests,
format/lint/typecheck/db:validate). Active work now happens on `claude/f5-post-merge` cut from
that `main`. F4 — Admin platform is **complete**: TMS-F4-001 (foundation) + TMS-F4-002 (order
management) + TMS-F4-003 (artwork manager) + TMS-F4-004 (garment manager + inventory) +
TMS-F4-005 (production + QC + fulfilment) + TMS-F4-006 (error centre + customers + analytics).

> **Merge recovery note (for future stacked merges):** GitHub's auto-retarget did **not** fire
> when `gh pr merge --delete-branch` deleted a PR's base branch — the dependent PR was **auto-closed**
> (and a closed PR whose base branch is gone can't be reopened or retargeted). Recovered by pushing
> the deleted base branch back, reopening the PR, and retargeting it to `main`. **Safe procedure:**
> retarget each next PR to `main` **before** merging, and delete phase branches only as a final
> cleanup step — never `--delete-branch` a branch that is still another open PR's base.

F3 — Commerce & account is **complete:** TMS-F3-001 (cart) + TMS-F3-002 (checkout) +
TMS-F3-003 (payment states) + TMS-F3-004 (auth) + TMS-F3-005 (account build-out) all Verified.

### F5 progress this session

- **Pre-order & made-to-order (TMS-F5-003) — Verified.** Pure `lib/fulfilment.ts` computes a
  made-to-order ship window from working-day production lead time (`addWorkingDays` in UTC,
  `madeToOrderWindow`, `preOrderWindow` — production starts when a drop opens, `isPreOrderStatus`,
  `madeToOrderSummary`) with **10 unit tests** (weekday-anchored for determinism). A client
  `MadeToOrderNote` renders the clock-free summary on the server and the absolute "estimated ship"
  dates after mount (hydration-safe, same pattern as the countdown). Wired into the product
  configurator (not-sold-out), cart summary, checkout order summary, and the drop detail (a
  **Pre-order** badge + ships-after-open estimate for upcoming/early-access; made-to-order for live).
  Verified in the browser: product/cart/checkout show "17 Jul–21 Jul" and the pre-order drop shows
  "21 Jul–23 Jul, after the drop opens" (correct weekend-skipping maths); no console errors. Full
  `pnpm check` green (129 storefront tests). Lead-time is a **frontend estimate** — real ship timing
  is server-authoritative and a real pre-order reservation is a backend concern (TMS-FBR-004/008).

- **Waitlist & back-in-stock (TMS-F5-002) — Verified.** Pure `lib/waitlist.ts` (`waitlistKey`,
  `hasEmail`, non-mutating case-insensitive `addEntry`, `joinWaitlist` validate + persist with an
  idempotent already-joined result; SSR-guarded `localStorage`; reuses `isValidEmail`/`normalizeEmail`)
  with **6 unit tests**. A reusable client `WaitlistForm` (labelled email input, `role="alert"` error,
  success/already-joined states, session prefill, honest "no notification sent" preview) is wired into
  the product configurator (sold-out → back-in-stock) and `DropEarlyAccess` (sold-out/ended → restock/
  next-drop; upcoming → "remind me when it opens" beside the sign-in CTA). One mock product
  (`okada-run-oversized-tee`) is now `sold_out` so the back-in-stock path is exercisable. Verified in
  the browser: valid submit → success + `localStorage` persist; invalid email → error + blocked; the
  drop forms render client-side; no console errors. Full `pnpm check` green (119 storefront tests). Gap
  under **TMS-FBR-008** (waitlist/notify).

- **Limited drops & countdown (TMS-F5-001) — Verified.** First F5 (growth) task, on the typed mock
  adapter. Pure `lib/drops.ts` derives drop status (upcoming / early access / live / ended / sold out)
  from timestamps + a `soldOut` flag relative to an explicit `now`, plus `nextMilestone` (the countdown
  target), `countdownParts`/`countdownLabel`, and `sortDrops` (active → finished, soonest first) —
  **24 new unit tests**. Provider gained `listDrops`/`getDrop` (+ api stubs) over a 5-drop dataset
  spanning every state, with now-relative mock timestamps so the preview countdowns stay live.
  `/drops` (index) + `/drops/[slug]` (detail: hero, status, big live countdown, early-access panel,
  story, pieces) with loading + not-found; a **Drops** nav item. `Countdown` is a client component that
  is hydration-safe (digits after mount), accessible (`role="timer"` summary) and reduced-motion safe;
  `DropEarlyAccess` is **UI-only** (routes guests to sign in, confirms members) with honest "preview —
  not enforced" notices (no real membership/waitlist). Both routes are **`force-dynamic`** so the clock
  is never frozen at build (a deliberate divergence from the static catalogue routes — see the TODO).
  Verified: full `pnpm check` green (113 storefront tests); in-browser — all states render + sort
  correctly, the countdown **ticks** (17→15s), no console/hydration errors, mobile 375px no overflow.
  Still 100% mock — gap logged as **TMS-FBR-008** (drops API + server-authoritative timeline/inventory).

### F4 progress this session

- **Error centre + customers + analytics (TMS-F4-006) — F4 complete.** The last three admin sections,
  all on the typed mock provider. **Error centre** (`/errors`): `AdminErrorEntry` + `listErrors(params)`
  over a **safe-by-construction** dataset — correlation ID + human summary only, **never** stack
  traces/payloads/secrets (spec §18) — across payment/webhook/shipping/image/email/AI/job sources. Pure
  `lib/errors.ts` (labels/tones, `filterErrors`, `openCount`, the `errorActions`/`applyErrorAction`
  resolution lifecycle gated on retryability); `ErrorCentreView` = unresolved banner + source/resolution/
  search filters + a card list with per-entry actions (local, honest notices). **Customers** (`/customers`
  - `/customers/[id]`): `AdminCustomerSummary`/`AdminCustomerProfile` + `listCustomers`/`getCustomer`
    **derived from the order dataset** (reconciled by contact email). Pure `lib/customers.ts`
    (`deriveCustomers`/`deriveCustomerProfile`, `customerStatus`, paid-only spend, `filterCustomers`);
    `CustomersView` directory + `CustomerDetailView` (order history → order detail, contact, summary;
    unknown id → not-found). **Analytics** (`/analytics`, new nav item): `AdminAnalytics` + `getAnalytics()`
    derived from orders. Pure `lib/analytics.ts` (`buildDailySeries` 14-day zero-filled, `statusBreakdown`,
    bar scaling); `AnalyticsView` = KPI cards + an accessible CSS daily-orders bar chart (with an sr-only
    data table) + status-mix bars + top artwork/garments. Admin Vitest suite now **116 tests**. Still 100%
    mock — gaps under **TMS-FBR-007** (error/ops + customer + analytics endpoints).
- Verified: full `pnpm check` green (116 admin + 89 storefront tests; build registers `/errors`,
  `/customers`, `ƒ /customers/[id]`, `/analytics`; db:validate valid); served build smoke test — all four
  return 200 with correct titles + `noindex`. The interactive click-throughs (error resolution actions +
  unresolved count, customer filter → profile, analytics chart/breakdown) are covered by the pure-domain
  unit tests; **not** re-driven in-browser here (the harness didn't expose the in-app browser tools).
  (Audit skipped — 410 outage, no new deps.)

- **Production + QC + fulfilment (TMS-F4-005).** Extended the admin data provider with a production
  board: `AdminProductionJob` + `ProductionStage`, and `listProductionJobs(params)` that **derives**
  active jobs from the existing order dataset (oldest-first, only on-board statuses) — so the board and
  the dashboard queue tiles share one source of truth. Pure `lib/production.ts` maps the pipeline lanes
  onto the shared `@tms/contracts` order state machine (no parallel enum): `productionStageForStatus`,
  `PRODUCTION_LANES`, `stageLabel`/`stageTone`, the `stageActions`/`applyStageAction` transition machine
  (queue → print → QC → ready → dispatch → delivered, plus QC **reprint** and **delivery exception** +
  retry), `filterJobs`/`groupByStage`/`stageCounts`, `formatAge`/`isPriority`, and shared
  `formatPrintStatus`/`printStatusTone`/`printStatusForOrderStatus` (the last now reused by the mock and
  by `OrderDetailView`, which also picks up a "Qc passed" → "QC passed" fix). `ProductionView` = stage
  filter chips with live counts (deep-linkable via `?stage=`), search, and a lane-grouped board of job
  cards (reference → order detail, customer, age + **priority** flag, per-line garment + print-status
  chips, shipping on dispatched/exception, and stage-transition buttons) — all local state with honest
  "would call the fulfilment API — not saved" notices. Route `/production` replaces the placeholder
  (noindex, Suspense-wrapped for `useSearchParams`). The dashboard's operational queues now derive their
  counts from the dataset and deep-link into the board. Admin Vitest suite now **88 tests**. Still 100%
  mock — gaps under **TMS-FBR-007** (fulfilment API + audited state machine).
- Verified: full `pnpm check` green (88 admin + 89 storefront tests; build registers `/production`;
  db:validate valid); served build smoke test — `/production`, `/production?stage=quality_check` return
  200 with the correct title + `noindex`. The interactive click-through (filter chips, QC pass/reprint,
  book & dispatch, mark delivered removes the card, flag/​retry exception, live "not saved" notices) is
  covered by the pure-domain unit tests; it was **not** re-driven in-browser here because this session's
  harness did not expose the in-app browser tools. (Audit skipped — 410 outage, no new deps.)

- **Garment manager + inventory (TMS-F4-004).** Extended the admin data provider with garment view
  models (`AdminGarmentSummary`/`AdminGarmentDetail` + `GarmentStatus`/`GarmentColour`/
  `GarmentVariant`/`GarmentSize`/`SizeChartRow`/`PrintArea`/`PlacementRule`), `listGarments(params)`
  (search + status filter) + `getGarment(id)` over a 7-garment dataset (tees/hoodie/cap/tote spanning
  active/draft/archived, deterministic per-variant stock so low/out states appear, one discontinued
  colourway, one-size garments). Pure `lib/garments.ts` (status format/tone, `filterGarments`,
  `garmentActions`/`applyGarmentAction` lifecycle, currency + inventory maths — `stockLevel`/
  `totalStock`/`countLowStock` (offered colours only) / `setVariantStock` (clamp ≥0 int) /
  `setColourAvailability`) is unit-tested. `GarmentsView` = searchable/filterable table (template,
  status, colour/size counts, price, stock + a low-stock badge) → row links to detail;
  `GarmentDetailView` = front/back media placeholders, colours (swatch + availability checkbox), an
  **editable inventory matrix** (colour × size, per-cell out/low/ok tone + legend + live total/restock
  tally), size chart, print-safe areas + placement rules, and details/pricing panels — all local
  state with honest "not persisted / would call the API" notices; a lifecycle action bar
  (activate/draft/archive/restore); unknown id → a not-found panel. Routes `/garments` (replaced the
  placeholder) + `/garments/[id]` (noindex). Admin Vitest suite now **68 tests**. Still 100% mock —
  gaps under **TMS-FBR-007** (garment catalogue read + write + inventory).
- Verified: full `pnpm check` re-run green this session (68 admin + 89 storefront tests; build
  registers `/garments` + `ƒ /garments/[id]`; db:validate valid); served build smoke test —
  `/garments`, `/garments/gm-classic-tee` return 200 with the correct titles/`noindex`. The interactive
  click-through (stock edit → live total 289→339 / restock 5→4, colour toggle → 3/4 offered, lifecycle
  transition, negative-clamp, discontinued colour) was documented in the prior same-session run and is
  covered by the pure-domain unit tests; it was **not** re-driven here because this session's harness
  did not expose the in-app browser tools. (Audit skipped — 410 outage, no new deps.)

- **Artwork manager (TMS-F4-003).** Extended the admin data provider with artwork view models
  (`AdminArtworkSummary`/`AdminArtworkDetail`, `ArtworkStatus`/`MockupApproval`/`VersionProcessing`),
  `listArtworks(params)` (search + status filter) + `getArtwork(id)`, over a 7-artwork dataset
  spanning the lifecycle. Pure `lib/artworks.ts` (status format/tone, search,
  `artworkActions`/`applyArtworkAction` publishing lifecycle, `setMockupApproval`/`approvalTally`/
  `canPublish`, `validateUpload`) is unit-tested. `ArtworksView` = searchable/filterable table +
  "New artwork"; `ArtworkDetailView` = mockup **approval** (approve/reject + tally), versions with
  **validation issues**, **lifecycle actions** (publish/schedule/archive/unpublish — gated so an
  artwork can't publish until every mockup is approved) with honest "not persisted" notices, plus
  story/tags/SEO/edition/compatibility panels; `ArtworkUpload` = a simulated
  upload → processing → validation → draft flow (real file input + samples, honest "no file stored"
  notice, reject/warn/pass paths). Routes `/artworks`, `/artworks/new`, `/artworks/[id]` (noindex).
  Admin Vitest suite now 46 tests. Still 100% mock — gaps under **TMS-FBR-007** (catalogue write:
  upload/processing/mockups/publish).
- Verified: full `pnpm check` green (46 admin + 89 storefront tests); browser pass (desktop +
  mobile) — list search/filter, needs_review detail (archive-only, failed version), publish blocked
  → approve all mockups → published, upload reject/pass/warn paths; no console errors; screenshots
  captured. (Audit skipped — 410 outage, no new deps.)

- **Order management (TMS-F4-002).** Extended the admin data provider with order view models
  (`AdminOrderSummary`/`AdminOrderDetail`), `listOrders(params)` (search + status filter +
  pagination over a deterministic 24-order dataset) and `getOrder(reference)`; the dashboard's
  recent orders now **derive** from this dataset so their links resolve. Pure `lib/orders.ts`
  (`filterOrders`/`paginate`/`pageCount`/`orderTimeline`) and `lib/order-notes.ts` (pure add/remove
  plus per-reference localStorage) are unit-tested; status helpers gained payment/shipping formatters
  and `paymentStatusTone`. `OrdersView` = searchable/filterable/paginated table (loading + empty
  states); `OrderDetailView` = status **timeline**, items with per-line **production/print status**,
  payment + shipment detail, customer + delivery, reconciling totals, **internal notes** (add +
  persist, authored by the signed-in staff), and honest fulfilment **action** placeholders (print
  asset / packing slip / resend / refund / return — "no action was taken"); unknown reference → a
  not-found panel. Routes `/orders` + `/orders/[reference]` (noindex). Admin Vitest suite now 32
  tests. Still 100% mock — gaps under **TMS-FBR-007** (admin order API + fulfilment actions + notes).
- Verified: full `pnpm check` green (32 admin + 89 storefront tests); browser pass (desktop +
  mobile) — list renders 24 orders, search (`chidi`→1), status filter (`Delivery exception`→1),
  pagination (Page 1 of 3), detail timeline/items/payment/shipment/totals, note add+persist, action
  placeholder alert, not-found; no console errors; screenshots captured. (Audit skipped — 410
  outage, no new deps.)

- **Admin foundation (TMS-F4-001).** The admin app (port 3001) gained its operational backbone,
  all on a typed mock adapter. Typed **admin data provider** (`lib/data/*` — `AdminDataProvider` +
  `mockAdminProvider` + loud-failing `apiProvider` stub + env switch; 4 tests) mirrors the
  storefront's data architecture (§26). Pure `lib/admin-auth.ts` (staff session validators +
  helpers, **no passwords stored**; 4 tests) + `AdminAuthProvider`. Pure `lib/order-status.ts`
  (`formatOrderStatus`/`orderStatusTone`; 2 tests). Client `AdminShell` = responsive sidebar +
  topbar (signed-in identity + sign out) + mobile `<dialog>` nav + an **auth gate** that redirects
  guests to `/login`. `AdminLoginForm` + `/login` (honest "preview — no real staff auth/RBAC"
  notice). `DashboardView` (loading/ready/error states) renders metric cards (revenue/paid
  orders/AOV + warning/danger tiles), deep-linked operational queues, a recent-orders table with
  **readable** statuses, and top-performer lists, behind a "preview data" notice. Shared
  `SectionPlaceholder` + scaffold routes (`/orders`, `/artworks`, `/garments`, `/production`,
  `/customers`, `/errors`, all `noindex`) keep nav intact until F4-002…006 build them. Added a
  Vitest config + `test` script to the admin app (10 tests total). Gaps: **TMS-FBR-006** (staff
  auth + RBAC) and **TMS-FBR-007** (admin read endpoints).
- Verified: full `pnpm check` green (10 admin tests + 89 storefront); browser pass (desktop +
  mobile) — guest `/` → `/login`, sign-in → dashboard, metrics/queues/recent-orders/top-lists
  render, section placeholders, mobile nav dialog opens/links/closes, sign-out clears session →
  `/login`; no console errors; dashboard screenshot captured. (Audit skipped — npm audit endpoint
  410 outage, no new deps added.)

### F3 progress (prior session)

- **Account build-out (TMS-F3-005).** Pure domain: `lib/order-status.ts` maps `OrderStatus` to
  **customer-facing** copy + a fulfilment tracking timeline (spec §17 — **no raw provider codes**,
  8 tests); `lib/account.ts` holds per-email order history / saved designs / wishlist stores + pure
  transforms (15 tests). Reactive `WishlistProvider` (user-scoped, `ready` flag) wraps the app; a
  `useRequireAuth` guard hook + a presentational `AccountShell` frame the signed-in pages. New
  surfaces: account **hub** (`AccountOverview` rebuilt — recent order + Orders/Saved designs/
  Wishlist/Profile tiles with live counts), `/account/orders` (list, friendly status),
  `/account/orders/[reference]` (**tracking timeline** + item/delivery/totals),
  `/account/saved-designs` (open-in-studio + remove), `/account/wishlist` (remove), and
  `/account/profile` (details + sign-out + honest preview notice) — all `noindex`. A shared
  `WishlistButton` sits on `ProductCard` (icon overlay, as a valid anchor sibling) and the product
  page (labelled). Wiring: checkout `recordOrder` on place; payment `updateOrderInHistory` on
  resolve; Design Studio gained **Save design**. Order history is keyed by **contact email** so a
  guest checkout reconciles on later sign-in. Still 100% mock/client store — the gaps are recorded
  under TMS-FBR-004 (orders API) and TMS-FBR-005 (account data: saved designs, wishlist).
- Verified: full `pnpm check` green (89 storefront tests); browser pass (desktop + mobile) on
  register → hub → place order → orders list → order detail/timeline → save design → saved designs
  → wishlist toggle → wishlist page → hub counts → guest guard `?next` → sign-out-home; no console
  errors. (Audit skipped — npm audit endpoint 410 outage, no new deps added.)

- **Auth + account (TMS-F3-004).** Mock **client session** — `lib/auth.ts` (register/login
  validation, account list + session helpers, **no passwords stored**, 6 unit tests) + `AuthProvider`
  (localStorage, `ready` flag). Shared `AuthForm` powers `/login` + `/register` (`?next=` redirect,
  honest preview notice); protected `/account` (`AccountOverview` — profile, recent order, sign out,
  "coming soon" tiles) redirects guests to `/login?next=/account`. Header gained an account link that
  reflects sign-in state; checkout **prefills** email + recipient from the session. App wrapped in
  `AuthProvider`. Login only checks the email exists (nothing to verify a password against) — real
  secure auth is **TMS-FBR-005**; feeds TMS-F3-005.
- Verified: full `pnpm check` green; browser pass on register/login/logout/duplicate/unknown-email/
  protected-redirect/next/prefill (desktop + mobile); no console errors. (Audit skipped this pass —
  npm audit endpoint 410 outage; no new deps added.)

- **Payment states (TMS-F3-003).** `/checkout/payment` (`PaymentProcessing`, Suspense-wrapped for
  `useSearchParams`) simulates a provider round-trip then resolves to **success** (order
  `PAID`/`SUCCEEDED`, bag cleared → status-aware `/checkout/success`), **pending** (`PAYMENT_PROCESSING`,
  bag cleared, pending panel), or **failure** (`PAYMENT_FAILED`, **bag kept**, retry from a clean URL
  succeeds). `lib/payment.ts` maps outcomes to the `OrderStatus`/`PaymentStatus` enums from
  `@tms/contracts` (4 unit tests); `PlacedOrder` gained `status`/`paymentStatus`; `updateLastOrder()`
  added; the confirmation is status-aware ("Order confirmed" + "Payment received" once paid).
  Natural checkout resolves to success; `?outcome=pending|failure` exercises the other states for
  review — **the server must own the real status (never a client param)**. No money moves.
- Verified: full `pnpm check` green; audit clean; browser pass on all outcomes + no-order guard +
  retry-to-success; no console errors.

- **Checkout (TMS-F3-002).** Single-page `CheckoutFlow` — contact, delivery address (Nigerian
  states select), delivery-method radios (mock `getDeliveryOptions()`), payment-method radios
  (Flutterwave card/transfer, clearly a preview), and a sticky itemised order summary (subtotal,
  promo, delivery, **VAT 7.5%**, total). Pure domain in `lib/checkout.ts` (email/NG-phone
  validation, section-namespaced errors, `computeOrderTotals`) + `lib/order.ts` (reference codec,
  `tms.lastOrder.v1` persistence) with 12 unit tests. "Place order" snapshots the order, clears the
  bag, and routes to `/checkout/success`, where `OrderConfirmation` renders items/totals/address/
  contact + an honest "payment pending" notice. Empty-cart and no-order guards included. **No real
  payment** — delivery/tax are mock and server-authoritative later (**TMS-FBR-004**); pairs with
  the upcoming TMS-F3-003 payment states.
- Verified: full `pnpm check` green; audit clean; browser pass (validation blocks empty submit,
  live totals ₦39,000 → ₦42,732.50, order placed with reference, confirmation, empty/no-order
  guards, mobile single-column). No console errors.

- **Cart (TMS-F3-001).** Pure cart domain in `lib/cart.ts` (line-merge id, add/set/remove,
  subtotal, mock promotions `STUDIO10`/`WELCOME`, estimated total) with 16 unit tests. Client
  `CartProvider` persists to `localStorage` (`tms.cart.v1`) with a `ready` flag so the SSR badge
  never mismatches, and owns the drawer open state. `CartDrawer` is a native `<dialog>` slide-over;
  `CartLineList` + `CartSummary` are shared by the drawer and the `/cart` page. Header bag button
  opens the drawer and shows an accessible live count badge.
- **Wiring.** Product configurator and Design Studio "Add to bag" now push real lines (studio
  lines carry placement/scale and link back to their share URL). An honest `/checkout` interim
  summary shows totals with no fake payment (full flow is TMS-F3-002).
- **Deliberately deferred:** delivery + tax are computed at checkout (server-authoritative); the
  cart shows a preview subtotal + preview promotion only. Backend gap = **TMS-FBR-003** in
  FRONTEND_TO_BACKEND.md.
- Verified: full `pnpm check` green; `pnpm audit --audit-level high --prod` clean (1 moderate);
  browser pass — add from both entry points, drawer + badge, promo apply/persist (₦36,000 →
  ₦32,400), quantity steppers update totals + badge live, `/cart` + `/checkout` + empty state,
  localStorage survives navigation, mobile drawer reflow. No console errors.

### F2 progress (prior session)

- `/design-studio`: guided flow (artwork → garment → colour → size → placement → scale) in a
  dark-gallery `DesignStudio` client component; live 2D DOM preview (colour-tinted garment,
  placement/scale-positioned artwork overlay, print-area guide, front/back toggle + "on the other
  side" hint); price summary; honest add-to-bag status (no fake cart — F3); **shareable config**
  via URL (`Copy share link` + resume from query params) backed by a pure, tested codec in
  `lib/studio.ts` (`parseStudioParams`/`buildStudioQuery`/`isStudioConfigComplete`); loading state.
- Data provider gained `getStudioOptions()` (colours/sizes/placements/scale presets) with an API
  stub and a provider test. Still 100% on the typed mock adapter.
- Verified: full `pnpm check` green; `pnpm audit --audit-level high --prod` clean (1 moderate,
  below threshold); browser pass — retint, placement/scale overlay moves, front/back logic, share
  URL round-trip/restore, keyboard + a11y (aria-pressed, live region, skip link), no console errors.

### F1 progress (prior session)

- Site chrome: accessible `SiteHeader` (native `<dialog>` mobile menu — focus trap, Esc,
  backdrop close, scroll lock, `aria-current`) + `SiteFooter` (labelled nav landmarks +
  newsletter form), wired into the root layout as the shared shell.
- Homepage refactored into editorial sections using the shared shell + reusable `ArtworkCard`.
- `/artworks` gallery listing (mock, loading skeletons, empty state) with **collection /
  availability / sort filters carried in the URL** (shareable, SSR), a desktop filter bar and an
  accessible mobile `<dialog>` filter drawer + active-filter chips; pure param parse/build is
  unit-tested (7 tests, first storefront Vitest suite). `/artworks/[slug]` gallery-style detail
  (breadcrumb, story, edition, related, Design Studio CTA, generateMetadata, segment not-found).
- 15 editorial/policy route scaffolds (real accessible placeholder pages) so nav never 404s.
- **Known defect TMS-F1-DEF-001:** `/artworks/[slug]` returns HTTP 200 (soft 404) for unknown
  slugs under Turbopack prod though the not-found UI renders correctly.
- Verified: full `pnpm check` green; served build smoke-tested (19 routes; valid detail 200,
  gallery lists mock artworks, mobile-menu dialog present).

## Work completed

- Read all control/contract/coordination files; confirmed `main` at `dd910ae9…`.
- Created branch `claude/f0-visual-foundation` from latest `main`.
- Base44 reference audited (computed design tokens extracted); `DESIGN_INVENTORY.md` written.
  Recorded that the live URL now serves a generic "moda.studio" template (content mismatch) —
  the master prompt/spec is authoritative for content.
- All persistent frontend docs created (master prompt verbatim, design inventory, design
  system, route inventory, accessibility, performance, visual-regression, content map).
- `packages/ui`: Tailwind v4 token layer (light + dark), typography + layout primitives, and 15
  foundation components with CVA variants; unit + a11y + token-contrast tests (35 passing).
- `apps/storefront`: Next.js App Router (TS strict), root layout (fonts/metadata/skip-link),
  root loading/error/not-found, editorial showcase homepage consuming the mock data provider,
  typed mock/api data-provider scaffold.
- `apps/admin`: Next.js App Router admin shell (sidebar/topbar, noindex), dashboard placeholder,
  root loading/error/not-found.
- Playwright harness (config + smoke/visual spec).
- Per-app `turbo.json` build outputs; `.gitignore` updated for `.next`/Playwright artifacts.

## Tasks verified

TMS-F0-001, -003, -004, -005, -006, -007, -008, -009, -011, -012; TMS-F1-001, -002, -003, -004,
-005, -007, -008, -009; TMS-F2-001; TMS-F3-001, -002, -003, -004, -005 (F3 complete);
**TMS-F4-001** (admin foundation); **TMS-F4-002** (order management); **TMS-F4-003** (artwork manager);
**TMS-F4-004** (garment manager + inventory); **TMS-F4-005** (production + QC + fulfilment);
**TMS-F4-006** (error centre + customers + analytics) — **F4 complete**.

## In-progress task

None active. **All enumerated F0–F4 tasks are now Verified** — this session closed the last three
loose ends: **TMS-F1-006** (real editorial/policy content, 12 routes), **TMS-F0-010** (committed
Playwright visual baselines, 4 viewports), and **TMS-F0-002** (Base44 breakpoint screenshots, with an
honest note they capture the mismatched "moda.studio" template). `implementedNotVerified` is empty.
Note: these three fixes were committed on the stack tip (`claude/f4-admin`); merging the stack brings
them to `main` with everything else.

## First recommended next task

**F0–F4 are merged to `main`.** Next: (a) clear the tracked soft-404 defect **TMS-F1-DEF-001**
(`/artworks/[slug]` returns 200 instead of 404 for unknown slugs under Next 16 Turbopack prod —
SEO-only, not-found UI already correct); then (b) scope **F5 (growth & AI)** and **F6 (hardening)**
into task rows from the master prompt/spec and build on the established patterns.

## Routes completed

Storefront `/` (showcase homepage), `/_not-found`. Admin `/` (dashboard), `/_not-found`.
Root loading/error boundaries for both apps.

## Components completed

cn util; Button, IconButton, Link, Badge, Card, Price, Skeleton, Spinner, Alert, EmptyState,
ErrorState, VisuallyHidden; Container, Stack, Eyebrow, Heading, Text.

## API contracts consumed

`@tms/contracts`: `CursorPage` (data provider), plus available `OrderStatus`/`PaymentStatus`/
`ShippingStatus`/`DesignConfigurationInput`/`PaginationQuery` ready for F1+.

## Mock data still in use

- Storefront homepage featured artworks → `apps/storefront/lib/data/mock.ts` (mockProvider).
  Real catalogue endpoints pending (TMS-FBR-001). `apiProvider` is a loud-failing stub until
  then. No screen is marked fully API-integrated.

## Requests for Codex

- TMS-FBR-001 (catalogue read: `GET /api/v1/artworks`, `GET /api/v1/artworks/{slug}`) logged in
  `docs/coordination/FRONTEND_TO_BACKEND.md`. Non-blocking (mock adapter in use).

## Screenshots and visual tests

- Playwright config + smoke/visual spec scaffolded; **baselines not yet generated** (browser
  install + running server needed). In-app browser screenshots failed (pane timeouts).
- Functional visual evidence instead: served storefront returns HTTP 200 with hero, gallery,
  mock artwork ("Midnight in Lagos"), design-system section, dark-theme panel, skip link; CSS
  emits token vars + self-hosted Space Grotesk; 404 route returns HTTP 404 with recovery UI.

## Accessibility status

Baseline in place: AA token-contrast test (light+dark) passing; axe checks on primitives
passing; visible focus ring; reduced-motion handling; skip-to-content link; icon-only controls
labelled; zoom not restricted; status conveyed by text+icon, not colour alone. Route-level axe
sweeps begin in F1.

## Performance status

Foundation only. Fonts self-hosted (no external request), tokens are zero-JS CSS vars, both apps
prerender static in build. LCP/INP/CLS baselines captured when F1 homepage lands.

## Files changed

New: `docs/agents/CLAUDE_FRONTEND_MASTER_PROMPT.md`; `docs/frontend/{DESIGN_INVENTORY,
DESIGN_SYSTEM,ROUTE_INVENTORY,ACCESSIBILITY,PERFORMANCE,VISUAL_REGRESSION,CONTENT_MAP}.md`;
`packages/ui/**` (package.json, tsconfigs, eslint, vitest, styles, components, tokens, tests);
`apps/storefront/**` and `apps/admin/**` (Next apps); per-app `turbo.json`.
Updated: `docs/progress/FRONTEND_TODO.md`, `docs/handoffs/FRONTEND_HANDOFF.md`,
`docs/coordination/FRONTEND_TO_BACKEND.md`, `.ai/frontend-state.json`, `.gitignore` (shared,
additive).

## Commands run

`pnpm install`; `pnpm check` (format:check, lint, typecheck, test, build, db:validate) — all
pass; `pnpm audit --audit-level high --prod` — pass; served build via `next start` + curl checks.

## Test results

35 unit/a11y/contrast tests passing (`@tms/ui`). Typecheck: 16/16 tasks pass. Lint: 16/16 pass.
Build: 13/13 pass (both apps prerender). No app-level Vitest suites yet (Playwright covers e2e).

## Known defects

- **TMS-F1-DEF-001** — soft 404 on catalogue detail routes. **Fixed for production hosting**
  (2026-07-15): `/artworks/[slug]`, `/collections/[slug]` and `/products/[slug]` now use
  `generateStaticParams` + `dynamicParams = false` (build records `fallback: false`), so unknown
  slugs return a **genuine 404 on static/CDN/edge hosting** and all valid pages are prerendered.
  Root cause corrected: **not Turbopack-specific** — a webpack build behaves identically; it's
  general Next 16 `next start` behavior where a matched dynamic route resolving to not-found
  streams a 200. **Residual (verified):** self-hosted `next start` still returns 200 for unknown
  slugs (styled not-found UI renders); no `NextResponse.rewrite` variant overrides the rendered
  status. If self-hosting behind `next start`, add a middleware/proxy slug-guard before launch.
  SEO-only; UI/UX unaffected. See FRONTEND_TODO.md for the full write-up.
- F0 follow-ups (Base44 PNG screenshots, Playwright baselines) are now **done** — see TMS-F0-002 /
  TMS-F0-010 above.

## Blockers

None. Domain APIs unavailable (expected at B0) — mitigated with typed mock adapter.

## Do not redo

Foundation stack (Next 16 + React 19 + Tailwind v4 + TS strict), token system, primitives,
app scaffolds, and CI-green wiring are done and verified. Do not re-scaffold. Do not modify
Codex-owned dirs (`apps/api`, `apps/worker`, `packages/{database,integrations,email}`, `infra`).
`packages/contracts` is consume-only.

## Exact continuation instruction

Continue the Tai Manic Studios frontend build. Read AGENTS.md,
docs/MASTER_PRODUCT_SPEC.md, docs/agents/CLAUDE_FRONTEND_MASTER_PROMPT.md,
docs/progress/FRONTEND_TODO.md, docs/handoffs/FRONTEND_HANDOFF.md,
docs/contracts/API_CONTRACT.md, docs/coordination/BACKEND_TO_FRONTEND.md, docs/DECISIONS.md,
docs/TRACEABILITY_MATRIX.md and .ai/frontend-state.json. Pull latest main; create
`claude/f1-storefront` from it. Do not repeat Verified F0 tasks. Optionally close the two F0
follow-ups (Base44 PNGs, Playwright baselines), then start TMS-F1-001 (global navigation +
accessible mobile menu), TMS-F1-002 (homepage sections), TMS-F1-003 (footer). Use the mock data
adapter, record any new API needs in FRONTEND_TO_BACKEND.md, add tests, run `pnpm check`, and
mark tasks Verified only when all acceptance criteria pass.
