# Frontend TODO

Owner: Claude Code. Statuses: `Not started` · `In progress` · `Blocked` · `Implemented` ·
`Verified`. A task is checked only when `Verified` (all acceptance criteria pass: UI,
responsive, keyboard, a11y, loading/error/empty states, API-or-recorded-mock, tests, typecheck,
lint, build, visual evidence, docs updated).

## Phase F0 — Reference audit & design foundation

- [x] **TMS-F0-001** Repository inspection & branch setup
  - Status: Verified
  - Evidence: main at `dd910ae9…` confirmed; branch `claude/f0-visual-foundation` from latest
    main; ownership dirs + control files read.

- [x] **TMS-F0-002** Base44 reference audit & design inventory
  - Status: **Verified** (2026-07-15) — reference inspected; tokens/typography/palette/layout/motion
    documented in `docs/frontend/DESIGN_INVENTORY.md`; **PNG breakpoint screenshots now captured**
    under `docs/reference/base44/` (4 viewports — desktop-1440/1280, tablet-768, mobile-390 — via
    Playwright/Chromium) with a README.
  - **Honest caveat:** the live URL serves a generic **"moda.studio" template** (content mismatch), so
    the screenshots are a dated visual record of the reference’s state, **not** a design target. The
    authoritative sources remain the master prompt/spec (content/structure) and the extracted tokens in
    `DESIGN_INVENTORY.md` + `packages/ui` (design). This is documented in the folder README.

- [x] **TMS-F0-003** Route inventory & content map
  - Status: Verified
  - Evidence: `ROUTE_INVENTORY.md` + `CONTENT_MAP.md` cover all master-prompt routes.

- [x] **TMS-F0-004** Design tokens & global styles (`packages/ui`)
  - Status: Verified
  - Evidence: all semantic tokens (light+dark) in `tokens.css`; Tailwind v4 `@theme` mapping in
    `theme.css`; token-contrast test passes AA (`tokens.spec.ts`); served CSS confirmed to emit
    `--color-background-primary`.

- [x] **TMS-F0-005** Typography & layout primitives
  - Status: Verified
  - Evidence: Space Grotesk + IBM Plex Sans self-hosted via `next/font` (confirmed in served
    CSS); Container/Stack/Eyebrow/Heading/Text primitives build and render.

- [x] **TMS-F0-006** Foundation component set (`packages/ui`)
  - Status: Verified
  - Evidence: Button, IconButton, Link, Badge, Card, Price, Skeleton, Spinner, Alert,
    EmptyState, ErrorState, VisuallyHidden. States covered; axe + Button unit tests pass
    (35 tests green); rendered live on the showcase page.

- [x] **TMS-F0-007** Storefront app scaffold (Next.js App Router)
  - Status: Verified
  - Evidence: App Router + TS strict; root layout (fonts/metadata/theme/skip-link); root
    `loading`/`error`/`not-found`; showcase homepage; `next build` prerenders; served HTTP 200
    with hero/gallery/mock data; 404 route returns HTTP 404 with recovery UI.

- [x] **TMS-F0-008** Admin app scaffold (Next.js App Router)
  - Status: Verified
  - Evidence: App Router + TS strict; admin shell (sidebar/topbar); `robots noindex`; root
    `loading`/`error`/`not-found`; dashboard placeholder; `next build` prerenders.

- [x] **TMS-F0-009** Accessibility baseline & contrast test
  - Status: Verified
  - Evidence: token-contrast unit test passes AA (light+dark); axe assertions on primitives
    pass; focus-visible ring + reduced-motion handling in `theme.css`; skip link present.

- [x] **TMS-F0-010** Visual-regression & e2e harness (Playwright)
  - Status: **Verified** (2026-07-15) — Chromium installed, the storefront served build run, and the
    suite executed: **8/8 pass** (4 viewports × [functional smoke + visual baseline]). **4 committed
    baselines** generated under `apps/storefront/tests/__screenshots__/visual/showcase.spec.ts/`
    (`home-{desktop-1440,desktop-1280,tablet-768,mobile-390}.png`); a second run **without**
    `--update-snapshots` passes against them, confirming they’re deterministic.
  - Acceptance met: Playwright configured (4 breakpoints, motion frozen, snapshot template); smoke +
    visual spec written and passing; committed baselines in place; documented in `VISUAL_REGRESSION.md`.
  - Note: baselines were rendered on Windows and the visual project is intentionally **not wired into
    `pnpm test`/CI** (per the config header) — regenerate per-platform with
    `pnpm --filter @tms/storefront test:e2e --update-snapshots` if CI runs on a different OS.
  - Follow-ups: extend coverage beyond the homepage (gallery, an editorial page, the design studio) and
    wire the visual project into CI once a stable rendering environment is fixed.

- [x] **TMS-F0-011** Typed data-provider scaffold (mock/api adapter)
  - Status: Verified
  - Evidence: provider interface + `mockProvider` (typed against `@tms/contracts` `CursorPage`)
    - `apiProvider` stub; env switch; homepage renders mock artworks live.

- [x] **TMS-F0-012** F0 verification & CI green
  - Status: Verified
  - Evidence: `pnpm check` (format:check, lint, typecheck, test, build ×2 apps, db:validate) all
    pass; `pnpm audit --audit-level high --prod` passes (1 moderate only). PR opened.

## Phase F1 — Public storefront (in progress)

- [x] **TMS-F1-001** Global navigation + accessible mobile menu
  - Status: Verified
  - Evidence: `SiteHeader` (client) with desktop nav + `<dialog>`-based mobile menu (native
    focus trap, Esc, backdrop-click close, body-scroll lock, `aria-current`, `aria-haspopup`);
    served markup includes `aria-label="Site menu"`; builds + full `pnpm check` green.

- [x] **TMS-F1-002** Homepage editorial sections
  - Status: Verified
  - Evidence: hero, featured gallery (mock adapter via `ArtworkCard`), design-system showcase
    (both themes), studio invitation; real route links; served HTTP 200.

- [x] **TMS-F1-003** Footer
  - Status: Verified
  - Evidence: `SiteFooter` with 4 labelled nav landmarks + accessible newsletter form (labelled
    input; submission wiring deferred to the newsletter endpoint).

- [x] **TMS-F1-004** Artwork gallery + detail
  - Status: Verified
  - Evidence: `/artworks` listing with **collection / availability / sort filters carried in the
    URL** (shareable, SSR — verified via query params: all=8, Comic Line=2, sold_out=1,
    unknown=0 → empty-state recovery), desktop filter bar + accessible mobile `<dialog>` filter
    drawer + active-filter chips, loading skeletons, empty state. `/artworks/[slug]`
    gallery-style detail (breadcrumb, story, edition, related, CTA, `generateMetadata`, segment
    `not-found`). Pure param parse/build unit-tested (7 tests). Full `pnpm check` green.
  - **Follow-ups (separate):** additional facets (search, theme, mood, colour-family, garment
    compatibility, limited-edition) need backend data fields (TMS-FBR-001); detail soft-404
    tracked as TMS-F1-DEF-001.

- [x] **TMS-F1-005** ArtworkCard component
  - Status: Verified
  - Evidence: `components/artwork/artwork-card.tsx`; reused by homepage, gallery and related.
    (ProductCard/CollectionCard follow with `/shop` + `/collections` build-out.)

- [x] **TMS-F1-006** Editorial & policy routes — real content
  - Status: **Verified** (2026-07-15) — `pnpm check` green (format/lint/typecheck/test/build ×2/
    db:validate); served build smoke test — all 12 routes return **200 with real content** (delivery
    shows "36 states"/"Production:"/"made to order"; size-guide renders the measurements table; FAQ
    shows Flutterwave) and **no** leftover "being built in phase" placeholder text on any of them.
  - Scope delivered: a shared `ContentPage` layout (landmarks, single h1, readable measure, consistent
    section typography, forward links) plus **real, brand-consistent copy** for all 12 editorial/policy
    routes — **about, artist, stories** (editorial); **delivery, returns, size-guide, care, faq,
    contact** (help — size-guide has a real measurements table, faq a native `<details>` accordion,
    contact real studio channels); **privacy, terms, cookies** (legal — plain-language, each carrying an
    honest "working draft, to be reviewed by legal counsel before launch, not legal advice" note). The
    now-unused `PlaceholderPage` component was removed. (The `collections`/`shop`/`design-studio` routes
    named in the old scaffold list already have real content from F1-008/009 + F2.)
  - Follow-ups: a full editorial journal for `/stories`, a working contact form + live chat, and
    legal-reviewed final policy copy before launch.

- [x] **TMS-F1-007** Site-wide search
  - Status: Verified
  - Evidence: `/search` route with an accessible SSR search form (GET, labelled, works without
    JS, shareable URLs), results grid, no-match empty state with recovery, blank-query
    suggestions, `noindex`; header search control wired as a real link. Pure matcher
    (`normalizeQuery`/`queryTerms`/`artworkMatchesQuery`) unit-tested (9 tests). Verified live:
    lagos=1, comic=2, zzz=0→no-match, blank→suggestions; browser screenshot confirms rendering.
    Full `pnpm check` green.
  - Follow-up: extend search to products/collections once those contracts land (TMS-FBR-001).

- [x] **TMS-F1-008** Collections
  - Status: Verified
  - Evidence: `/collections` index (real listing via `CollectionCard`) and `/collections/[slug]`
    detail (breadcrumb, description, member artworks, `generateMetadata`, segment `not-found`),
    loading skeletons, empty state. Provider gained `listCollectionSummaries()` +
    `getCollection()` (+ api stubs); provider unit-tested (5 tests). Verified live: index shows
    4 collections; `night-studies` detail shows exactly its 2 artworks; unknown slug → not-found
    UI. Browser screenshot confirms rendering. Full `pnpm check` green (21 storefront tests).

- [x] **TMS-F1-009** Shop + product page
  - Status: Verified
  - Evidence: `/shop` listing via new `ProductCard`; `/products/[slug]` with an interactive
    `ProductConfigurator` (client): colour swatches + size chips as accessible radio groups
    (unavailable options disabled), live colour-tinted preview, front/back toggle, quantity
    control, size-required validation (role=alert), fabric/fit/print/care/delivery/returns
    details, and a **sticky mobile purchase bar**. Add-to-bag shows an honest "arrives in F3"
    status — no fake cart. Provider gained `listProducts()`/`getProduct()` (+ api stubs);
    3 provider tests. Verified live (shop=6, product 200, invalid→not-found) and in-browser
    (colour Black→Bone retints preview; radio semantics confirmed via a11y tree). Logged
    **TMS-FBR-002**. Full `pnpm check` green (24 storefront tests).
  - Follow-up: per-colour×size availability matrix + real front/back artwork imagery need
    backend data (TMS-FBR-002); ColourSwatch/SizeSelector/QuantityControl to be promoted into
    `packages/ui`.

### Known defects

- **TMS-F1-DEF-001** — soft 404 on catalogue detail routes. **Fixed for production hosting**
  (2026-07-15) and root-caused. `/artworks/[slug]`, `/collections/[slug]` and `/products/[slug]`
  now use `generateStaticParams` + `export const dynamicParams = false`, so all valid detail
  pages are prerendered (`●` SSG) and the build records **`fallback: false`** for each dynamic
  route — which returns a **genuine HTTP 404** for unknown slugs on static/CDN/edge hosting.
  All three list off the finite mock catalogue today (swap to the real API under TMS-FBR-001/002).
  - **Root cause (corrected):** the earlier note blamed Turbopack — **wrong**. A **webpack**
    production build behaves identically, so this is general Next 16 App Router behavior, not a
    Turbopack bug. On the self-hosted `next start` Node server, a _matched_ dynamic route that
    resolves to not-found is rendered dynamically and the streamed response commits **200**
    before the status can be set; only _completely unmatched_ paths (e.g. `/totally-unknown`) get
    the routing-layer 404 (verified: root not-found → 404, dynamic-slug not-found → 200).
  - **Residual (verified):** under `next start` the three routes still return **200** for unknown
    slugs (the styled not-found UI renders correctly). `NextResponse.rewrite` — with or without a
    `status: 404` init — does **not** override the rendered-page status, so there is no clean
    middleware fix that preserves the styled page; only a bare `new NextResponse(body, {status:404})`
    would, at the cost of the styled UI. Given the fix yields correct 404s on CDN/edge deployment
    (`fallback: false`), the residual is a self-hosted-serving artifact, not a code defect. SEO-only;
    UI/UX unaffected. Re-verify the 404 status on the chosen production host; if the app is
    self-hosted behind `next start`, add a lightweight slug-guard (middleware returning a real 404
    for unknown catalogue slugs, or a reverse-proxy rule) before launch.

## Phase F2 — Design Studio (TMS-F2-001 done)

- [x] **TMS-F2-001** Design Studio shell + guided flow + 2D preview + share
  - Status: **Verified** (2026-07-14) — `pnpm check` green (format/lint/typecheck/test/build ×2/
    db:validate); `pnpm audit --audit-level high --prod` clean (1 moderate only, below threshold);
    browser pass on `/design-studio`: colour retint (Slate→Black), placement/scale move the overlay
    (left-chest/small: 33%/30%/20%w), front/back toggle hides the front-placed artwork with the
    "on the other side" hint, and the pre-filled share URL restores full state. No console errors;
    keyboard focus, `aria-pressed`, live region and skip link all present.
  - Scope delivered: `/design-studio` guided flow (artwork → garment → colour → size → placement →
    scale) in a dark-gallery `DesignStudio` client component; live 2D DOM preview (colour-tinted
    garment, positioned artwork overlay by placement + scale, print-area guide, front/back toggle,
    "artwork is on the other side" hint); summary with price; honest add-to-bag status (no fake
    cart, F3); **shareable config** via URL (`Copy share link` + resume from query params) with a
    pure, tested codec (`parseStudioParams`/`buildStudioQuery`/`isStudioConfigComplete`, round-trip
    tested); loading state. Provider gained `getStudioOptions()` (colours/sizes/placements/scale) +
    api stub + 1 provider test.
  - Acceptance criteria to confirm at Verified: `pnpm check` green; keyboard + a11y pass; live
    preview updates on every control; share link round-trips; mobile layout; visual evidence.
  - Follow-ups: `/design-studio/[configurationId]` resume route; contrast warning + undo; promote
    ColourSwatch/SizeSelector/preview into `packages/ui`; real placement coords/imagery via backend.

## Phase F3 — Commerce & account (in progress)

- [x] **TMS-F3-001** Cart — drawer + page + promotion + add-to-bag wiring
  - Status: **Verified** (2026-07-15) — `pnpm check` green (format/lint/typecheck/test/build ×2/
    db:validate); `pnpm audit --audit-level high --prod` clean (1 moderate, below threshold);
    browser pass: product **and** Design Studio "Add to bag" both add lines (studio lines carry
    placement/scale + link back to their share URL); drawer opens with a live header count badge;
    promotion `STUDIO10` applies 10% (₦36,000 → ₦32,400) and persists; quantity steppers update
    totals + badge live; `/cart` page, `/checkout` interim summary, and the empty state all render;
    state survives navigation (localStorage) and reflows correctly on mobile. No console errors.
  - Scope delivered: pure cart domain in `lib/cart.ts` (line-merge id, add/set/remove, subtotal,
    mock promotions, estimated total) with 16 unit tests; client `CartProvider`
    (localStorage-persisted, `ready` flag to avoid SSR badge mismatch, drawer open state);
    `CartDrawer` (native `<dialog>` slide-over), shared `CartLineList` + `CartSummary`, `/cart`
    page + loading, and an honest `/checkout` interim summary (no fake payment). Header bag button
    wired to open the drawer with an accessible count badge. Product configurator + Design Studio
    "Add to bag" now push real lines. **Delivery + tax are intentionally deferred to checkout**
    (server-authoritative). Backend gap recorded as TMS-FBR-003.
  - Follow-ups: server cart/promotion/totals (TMS-FBR-003); persist across devices once auth lands.

- [x] **TMS-F3-002** Checkout — contact / delivery / payment + order confirmation
  - Status: **Verified** (2026-07-15) — `pnpm check` green (format/lint/typecheck/test/build ×2/
    db:validate); `pnpm audit --audit-level high --prod` clean (1 moderate, below threshold);
    browser pass (desktop + mobile): validation blocks an empty submit (7 field errors, `aria-invalid`,
    focus jumps to the first invalid field); live totals recompute (Subtotal ₦39,000 − ₦3,900 promo
    - ₦5,000 express delivery + ₦2,632.50 VAT = ₦42,732.50); "Place order" snapshots the order,
      clears the bag, and routes to `/checkout/success` with a reference (`TMS-DQXGCG`); confirmation
      shows items/totals/address/contact + an honest "payment pending" notice; empty-cart and
      no-order guards both render. No console errors.
  - Scope delivered: single-page checkout (`CheckoutFlow`) — contact, delivery address (Nigerian
    states select), delivery-method radios (from mock `getDeliveryOptions()`), payment-method
    radios (Flutterwave card/transfer, clearly a preview), and a sticky itemised order summary
    (subtotal, promo, delivery, VAT 7.5%, total). Pure domain in `lib/checkout.ts` (email/NG-phone
    validation, section-namespaced errors, `computeOrderTotals`) + `lib/order.ts` (reference codec,
    last-order persistence) with 12 unit tests. `/checkout/success` `OrderConfirmation` reads the
    placed order; `/checkout` + `/checkout/success` + loading states. Provider gained
    `getDeliveryOptions()` + api stub + 1 provider test. **No real payment** — delivery/tax are
    mock and server-authoritative later (TMS-FBR-004).
  - Follow-ups: server delivery quote + order + payment intent (TMS-FBR-004); wire into TMS-F3-003
    payment states.
- [x] **TMS-F3-003** Payment states — processing / success / pending / failure
  - Status: **Verified** (2026-07-15) — `pnpm check` green (format/lint/typecheck/test/build ×2/
    db:validate); `pnpm audit --audit-level high --prod` clean (1 moderate, below threshold);
    browser pass on all outcomes: checkout "Place order" → `/checkout/payment` shows a processing
    state, then resolves — **success** → order `PAID`/`SUCCEEDED`, bag cleared, status-aware
    `/checkout/success` ("Order confirmed" + "Payment received"); **failure** → `PAYMENT_FAILED`,
    **bag kept**, retry (clean URL) resolves to success; **pending** → `PAYMENT_PROCESSING`, bag
    cleared, pending panel. No-order guard renders; no console errors.
  - Scope delivered: `/checkout/payment` (`PaymentProcessing`, Suspense-wrapped for
    `useSearchParams`) with a simulated provider round-trip and processing/pending/failure UIs;
    `lib/payment.ts` (outcome parse + `OrderStatus`/`PaymentStatus` mapping from `@tms/contracts`,
    cart-clear policy) with 4 unit tests; `PlacedOrder` gained `status` + `paymentStatus`;
    `updateLastOrder()` helper. Checkout now hands off to payment (bag kept until resolved);
    confirmation is status-aware. Natural flow resolves to success; `?outcome=pending|failure`
    exercises the other states for review (server must own the real status — never a client param).
  - Follow-ups: real payment intent + webhook-verified status + idempotent retry (TMS-FBR-004);
    surface order status history once the orders API + account (TMS-F3-005) land.
- [x] **TMS-F3-004** Auth — registration + login + account (mock session)
  - Status: **Verified** (2026-07-15) — `pnpm check` green (format/lint/typecheck/test/build ×2/
    db:validate); audit not run this pass (npm audit endpoint returned a registry-side 410 outage;
    **no new dependencies added**, so risk is unchanged from the last clean run). Browser pass
    (desktop + mobile): register (validation → success → session + account created with **no
    password stored** → redirect to `/account`); duplicate email rejected (case-insensitive);
    login (unknown-email error; success restores the session); sign-out clears the session, updates
    the header, and lands home; guest `/account` → `/login?next=/account`; `?next=` sends the user
    onward (→ `/checkout`); checkout **prefills** email + recipient from the session; header account
    link reflects state. No console errors.
  - Scope delivered: pure domain in `lib/auth.ts` (register/login validation, account list +
    session helpers — **no passwords persisted**) with 6 unit tests; `AuthProvider`
    (localStorage-backed session, `ready` flag); shared `AuthForm` (login/register, `?next=`
    redirect, honest preview notice); `/login`, `/register`, protected `/account`
    (`AccountOverview` — profile, recent order, sign out, "coming soon" tiles). Header gained an
    account link; checkout prefills from the session. Wrapped the app in `AuthProvider`.
  - Follow-ups: real secure auth (cookie session) — TMS-FBR-005; feeds TMS-F3-005 (orders / saved
    designs / wishlist).
- [x] **TMS-F3-005** Account — orders list, order detail + tracking, saved designs, wishlist
  - Status: **Verified** (2026-07-15) — `pnpm check` green (format/lint/typecheck/test/build ×2/
    db:validate; 89 storefront unit tests); `pnpm audit --audit-level high --prod` not run (npm audit
    endpoint returned a registry-side 410 outage as on F3-004; **no new dependencies added**, so risk
    is unchanged from the last clean run). Browser pass (desktop + mobile): register → account hub
    with live tiles (Orders/Saved designs/Wishlist/Profile + counts); placed order recorded to history
    and shown under `/account/orders` with a **human status** ("Order confirmed", never a raw code);
    `/account/orders/[reference]` renders the fulfilment **tracking timeline** (Order confirmed →
    Delivered) with the reached step current and the rest upcoming; Design Studio **Save design** →
    `/account/saved-designs` (open-in-studio restores the config, remove works); wishlist hearts on
    shop cards toggle live (aria-pressed, no card navigation) → `/account/wishlist` (2 items, remove);
    hub counts (1/1/2) reflect state; guest guard redirects to `/login?next=…` (param preserved);
    sign-out lands home with no redirect bounce. No console errors.
  - Scope delivered: pure domain in `lib/order-status.ts` (§17 customer-facing status +
    `orderTracking` timeline — **no raw provider codes**, 8 unit tests) and `lib/account.ts`
    (per-email order history / saved designs / wishlist stores + pure transforms, 15 unit tests);
    reactive `WishlistProvider` (user-scoped, `ready` flag) wrapped in the layout; `useRequireAuth`
    guard hook + presentational `AccountShell`; account hub (`AccountOverview` rebuilt with counts +
    recent order), `OrdersList`, `OrderDetail` (tracking timeline + totals), `SavedDesignsView`,
    `WishlistView`, `ProfileView`, and a shared `WishlistButton` (icon overlay on `ProductCard` as a
    valid anchor sibling; labelled on the product page). Routes: `/account/orders`,
    `/account/orders/[reference]`, `/account/saved-designs`, `/account/wishlist`, `/account/profile`
    (all `noindex`, §25). Wiring: checkout `recordOrder` on place; payment sync via
    `updateOrderInHistory` on resolve; Design Studio **Save design**. Order history is keyed by the
    order's **contact email** so a guest checkout and a later sign-in with the same address share the
    same orders. Still 100% mock/client store — backend gaps under TMS-FBR-004 (orders API) and
    TMS-FBR-005 (auth + account data: saved designs, wishlist).
  - Follow-ups: real orders/tracking + account-data APIs (TMS-FBR-004/005); once auth is
    cookie-backed, migrate the per-email localStorage stores to the server; notification prefs,
    email verification, password reset, data-export/deletion (profile placeholders today).

### F3 complete

All F3 tasks (TMS-F3-001…005) are Verified.

## Phase F4 — Admin platform (in progress)

Planned breakdown (IDs assigned as work starts): **F4-001** admin foundation (shell, mock staff
auth gate, mock admin data provider, dashboard) · **F4-002** order management (table, filters,
pagination, order detail + timeline, actions) · **F4-003** artwork manager (list, upload,
processing/validation, mockup approval, publish/schedule/archive) · **F4-004** garment manager +
inventory · **F4-005** production + quality control + fulfilment · **F4-006** error centre +
customers + analytics.

- [x] **TMS-F4-001** Admin foundation — shell + staff auth gate + mock data provider + dashboard
  - Status: **Verified** (2026-07-15) — `pnpm check` green (format/lint/typecheck/test/build ×2/
    db:validate; **10 new admin unit tests**, admin now has its own Vitest suite); `pnpm audit
--audit-level high --prod` not run (npm audit endpoint returned the same registry-side 410 seen
    since F3-004; **no new dependencies added** — Vitest is a hoisted root dev dep — so risk is
    unchanged). Browser pass (desktop + mobile) on the admin app (port 3001): unauthenticated
    `/` → redirect to `/login`; sign-in starts a demo staff session → dashboard; dashboard renders
    metrics (revenue/paid orders/AOV + warning/danger tiles), operational queues (production/QC/
    dispatch/delivery-exceptions, deep-linked), a recent-orders table with **readable** statuses,
    and top-performer lists, behind a loading→ready state + honest "preview data" notice; section
    placeholders (orders/customers) render with "Coming in TMS-F4-00x"; sidebar collapses to an
    accessible mobile `<dialog>` nav (opens, links, closes on select); sign-out clears the session
    and returns to `/login`. No console errors; screenshot captured.
  - Scope delivered: typed **admin mock data provider** (`lib/data/*` — `AdminDataProvider`,
    `mockAdminProvider`, loud-failing `apiProvider` stub, env switch; 4 provider tests) mirroring the
    storefront's data architecture (§26); pure `lib/admin-auth.ts` (staff session validators +
    helpers, **no passwords stored**; 4 tests) + `AdminAuthProvider`; pure `lib/order-status.ts`
    (`formatOrderStatus`/`orderStatusTone`; 2 tests). Client `AdminShell` (responsive sidebar +
    topbar + mobile `<dialog>` nav + **auth gate** redirecting guests to `/login`), `AdminLoginForm`
    - `/login`, `DashboardView` (loading/ready/error states) + rebuilt `/` dashboard, shared
      `SectionPlaceholder`, and scaffold routes for `/orders`, `/artworks`, `/garments`, `/production`,
      `/customers`, `/errors` (all `noindex`). Added a Vitest config + `test` script to the admin app.
      Everything runs on the typed mock adapter — no admin backend. Gaps: TMS-FBR-006 (staff auth +
      RBAC) and TMS-FBR-007 (admin read endpoints).
  - Follow-ups: F4-002…006 build the real sections on the provider; wire to the admin API on
    delivery; real staff auth + role-based access + httpOnly cookie session (TMS-FBR-006).

- [x] **TMS-F4-002** Order management — table (search/filter/pagination) + order detail
  - Status: **Verified** (2026-07-15) — `pnpm check` green (format/lint/typecheck/test/build ×2/
    db:validate; **32 admin unit tests**, up from 10); `pnpm audit` not run (same registry-side 410
    outage; **no new dependencies added**). Browser pass (desktop + mobile) on the admin app:
    `/orders` lists 24 sample orders (newest first) with reference/customer/date/status/total;
    **search** by reference/name/email (`chidi` → 1) and **status filter** (`Delivery exception` →
    1. both narrow the list; **pagination** (Page 1 of 3) pages through; row + dashboard links open
       `/orders/[reference]`; the **detail** shows a status **timeline** (Paid → Production queued →
       Printing · Current), items with per-line **production/print status**, payment detail (method,
       status, provider ref), shipment detail (carrier/status/tracking/ETA), customer + delivery,
       reconciling totals (₦23,000 + ₦2,500 + ₦1,725 = ₦27,225), and an **internal note** added +
       persisted (keyed by reference, authored by the signed-in staff); the fulfilment **actions**
       (print asset / packing slip / resend / refund / return) are honest placeholders ("no action was
       taken"); an unknown reference shows a not-found panel. No console errors; screenshots captured.
  - Scope delivered: extended the admin data provider (`AdminOrderSummary`/`AdminOrderDetail` view
    models, `listOrders(params)` with search/status/pagination + `getOrder(reference)`; deterministic
    24-order dataset; dashboard recent-orders now **derive** from it so links resolve); pure
    `lib/orders.ts` (`filterOrders`/`paginate`/`pageCount`/`orderTimeline`; tested) and
    `lib/order-notes.ts` (pure add/remove + per-reference localStorage; tested); status helpers gained
    `formatPaymentStatus`/`formatShippingStatus`/`paymentStatusTone`. New `OrdersView` (search + status
    select + paginated table + loading/empty states) and `OrderDetailView` (timeline, items+production,
    payment, shipment, customer, delivery, totals, internal notes, honest action buttons); routes
    `/orders` + `/orders/[reference]` (noindex). Still 100% mock — order data + fulfilment actions need
    TMS-FBR-007; notes need a notes endpoint.
  - Follow-ups: real order list/detail + fulfilment actions (print asset, packing slip, refund,
    return, notification resend) + notes via the admin API (TMS-FBR-007); URL-synced filters for
    shareable views; server-side pagination.

- [x] **TMS-F4-003** Artwork manager — list + detail (versions/mockups/lifecycle) + upload
  - Status: **Verified** (2026-07-15) — `pnpm check` green (format/lint/typecheck/test/build ×2/
    db:validate; **46 admin unit tests**, up from 32); `pnpm audit` not run (same registry-side 410
    outage; **no new dependencies added**). Browser pass (desktop + mobile): `/artworks` lists 7
    sample artworks (search title/collection + status filter) with status/version/mockup columns;
    `/artworks/[id]` shows the **needs_review** artwork with only an Archive action, a **failed**
    version listing its validation issues, and publish gated; on a **ready** artwork, Publish is
    **blocked** until every mockup is **approved** (approve → tally `2 approved / 0 pending`), then
    Publish transitions to **Published** (honest "would call the API — status set locally" notice;
    actions update to Unpublish); the SEO / edition / compatibility panels render; `/artworks/new`
    **upload** flow rejects an unsupported format, runs a valid PNG through uploading → processing →
    validating → **Draft created** (all checks passed), and a low-res PNG through to **Passed with
    warnings**. No console errors; screenshots captured.
  - Scope delivered: extended the admin data provider (`AdminArtworkSummary`/`AdminArtworkDetail` +
    `ArtworkStatus`/`MockupApproval`/`VersionProcessing`; `listArtworks(params)` + `getArtwork(id)`;
    7-artwork dataset spanning the lifecycle); pure `lib/artworks.ts` (status format/tone, search,
    `artworkActions`/`applyArtworkAction` lifecycle, `setMockupApproval`/`approvalTally`/`canPublish`,
    `validateUpload`; 14 tests). `ArtworksView` (searchable/filterable table + "New artwork"),
    `ArtworkDetailView` (mockup approval, versions + validation issues, lifecycle actions gated on
    approval, story/tags/SEO/edition/compatibility — all local state with honest "not persisted"
    notices), and `ArtworkUpload` (simulated upload/progress/processing/validation with real file
    input + samples, honest "no file stored" notice). Routes `/artworks`, `/artworks/new`,
    `/artworks/[id]` (noindex). Still 100% mock — needs TMS-FBR-007 (catalogue write: upload +
    processing + mockup generation + publish/schedule/archive + SEO/edition).
  - Follow-ups: real upload + async processing + mockup generation + lifecycle persistence via the
    catalogue API (TMS-FBR-007); editable metadata forms (story/tags/SEO/edition) once the write API
    lands; version re-upload + reprocess.

- [x] **TMS-F4-004** Garment manager + inventory — list + detail (colours/sizes/stock/media/print)
  - Status: **Verified** (2026-07-15) — `pnpm check` green (format/lint/typecheck/test/build ×2/
    db:validate; **68 admin unit tests**, up from 46); `pnpm audit` not run (same registry-side 410
    outage; **no new dependencies added**). Browser pass (desktop + mobile): `/garments` lists 7
    sample garments (newest first) with template/status/colours/sizes/price/stock + a **low-stock**
    badge; **search** (`hoodie` → Pullover Hoodie) and **status filter** (`Draft` → Crewneck
    Sweatshirt) narrow the list; row links open `/garments/[id]`; the **detail** renders front/back
    media placeholders, colours (swatch + availability checkbox), an editable **inventory matrix**
    (colour × size, per-cell out/low/ok tone + legend, ₦ price), size chart, print-safe areas +
    placement rules, and fabric/fit/care + pricing panels; **editing a stock cell** updates the
    on-hand total (289 → 339) and restock count (5 → 4) live with an honest "not saved" notice, and
    a negative value clamps to 0; **unchecking a colour** drops "colours offered" to 3/4 and excludes
    it from the restock count; a **lifecycle** action (Move to draft → Draft, actions become
    Activate/Archive) transitions with an honest "would call the API — set locally" notice; an
    unknown id shows a not-found panel; discontinued colours (Long-sleeve bone) show as unavailable.
    Mobile: panels stack single-column and the wide inventory/size-chart tables scroll inside their
    own containers (no page-level horizontal scroll). No console errors; screenshots captured.
  - Scope delivered: extended the admin data provider (`AdminGarmentSummary`/`AdminGarmentDetail` +
    `GarmentStatus`/`GarmentColour`/`GarmentVariant`/`SizeChartRow`/`PrintArea`/`PlacementRule`;
    `listGarments(params)` + `getGarment(id)`; 7-garment dataset with deterministic per-variant stock
    so low/out states appear, one discontinued colourway, and one-size garments). Pure `lib/garments.ts`
    (status format/tone, search, `garmentActions`/`applyGarmentAction` lifecycle, currency + inventory
    maths — `stockLevel`/`totalStock`/`countLowStock`/`setVariantStock`/`setColourAvailability`; 16
    tests) + provider tests. `GarmentsView` (searchable/filterable table with stock + low-stock badges)
    and `GarmentDetailView` (media, colours, editable stock matrix, size chart, print areas + placement
    rules, details/pricing — all local state with honest "not persisted" notices). Routes `/garments`
    (replaced placeholder) + `/garments/[id]` (noindex). Still 100% mock — needs TMS-FBR-007 (garment
    catalogue read + write: templates/colours/sizes/size charts/media/print rules/prices + inventory).
  - Follow-ups: real garment read/write + inventory adjustments via the catalogue API (TMS-FBR-007);
    editable metadata (fabric/fit/care/size chart/print areas) + media upload once the write API lands;
    per-colour×size availability that the storefront product page can consume (pairs with TMS-FBR-002).

- [x] **TMS-F4-005** Production + QC + fulfilment — board (jobs derived from orders) + stage actions
  - Status: **Verified** (2026-07-15) — `pnpm check` green (format/lint/typecheck/test/build ×2/
    db:validate; **88 admin unit tests**, up from 68; **89 storefront**); `pnpm audit` not run (same
    registry-side 410 outage; **no new dependencies added**). Served-route smoke test: `/production`
    and `/production?stage=quality_check` return **200** with the correct title + `noindex`; `pnpm build`
    registers `/production` (static, searchParams behind a Suspense boundary). The interactive
    click-through (stage filter chips narrow the board; a QC job → **QC pass** advances it to _Ready for
    dispatch_ / **Reprint** sends it back to _Printing_; **Book & dispatch**, **Mark delivered** removes
    the card from the board; **Flag exception** / **Retry dispatch**; each with an honest "would call the
    fulfilment API — updated locally, not saved" notice) is covered by the pure-domain unit tests but was
    **not** re-driven in-browser this session (the harness didn't expose the in-app browser tools).
  - Scope delivered: extended the admin data provider (`AdminProductionJob` + `ProductionStage`;
    `listProductionJobs(params)` deriving active jobs from the existing order dataset, oldest-first, only
    on-board statuses). Pure `lib/production.ts` (stage⇄`OrderStatus` mapping, `PRODUCTION_LANES`,
    `stageLabel`/`stageTone`, the `stageActions`/`applyStageAction` transition machine —
    queue→print→QC→dispatch plus QC reprint + delivery exceptions, `filterJobs`/`groupByStage`/
    `stageCounts`, `formatAge`/`isPriority`, and shared `formatPrintStatus`/`printStatusTone`/
    `printStatusForOrderStatus`; 20 tests) + provider tests. `ProductionView` = stage filter chips with
    live counts (deep-linkable via `?stage=`), search, and a lane-grouped board of job cards (reference →
    order detail, customer, age + **priority** flag, per-line garment/print-status chips, shipping for
    dispatched/exception, and stage-transition action buttons) — all local state with honest "not saved"
    notices. Route `/production` replaces the placeholder (noindex, Suspense-wrapped). The dashboard's
    operational queue tiles now **derive** their counts from the same dataset and deep-link into the board
    (`?stage=quality_check` / `ready_for_dispatch` / `exception`), so they resolve to real views.
    Refactored `OrderDetailView` to reuse the shared print-status helpers (also fixes "Qc passed" →
    "QC passed"). Still 100% mock — needs TMS-FBR-007 (fulfilment API + audited state machine).
  - Follow-ups: real production/fulfilment endpoints + the audited state machine (actor/reason/
    correlation-id/provider event per transition, spec §"Operations"); print-file (production asset)
    access + per-line QC results (not just an order-level stage); packing slips + carrier booking;
    production notes.

- [x] **TMS-F4-006** Error centre + customers + analytics — the last three admin sections
  - Status: **Verified** (2026-07-15) — `pnpm check` green (format/lint/typecheck/test/build ×2/
    db:validate; **116 admin unit tests**, up from 88; **89 storefront**); `pnpm audit` not run (same
    registry-side 410 outage; **no new dependencies added**). Served-route smoke test: `/errors`,
    `/customers`, `/customers/[id]` (`ada.verify%40example.com`) and `/analytics` all return **200**
    with the correct titles + `noindex`; `pnpm build` registers all four routes. Interactive
    click-throughs (error resolution actions retry/investigate/resolve/ignore/reopen with the unresolved
    count updating; customer search/status filter → profile with order history; analytics KPIs + daily
    bar chart + status-mix bars + top lists) are covered by the pure-domain unit tests but were **not**
    re-driven in-browser this session (the harness didn't expose the in-app browser tools).
  - Scope delivered — three surfaces on the admin data provider:
    - **Error centre** (`/errors`): `AdminErrorEntry` + `listErrors(params)` over a **safe-by-construction**
      dataset (correlation ID + human summary only — **never** stack traces/payloads/secrets, spec §18),
      across payment/webhook/shipping/image/email/AI/job sources. Pure `lib/errors.ts` (source/severity/
      resolution labels + tones, `filterErrors`, `openCount`, the `errorActions`/`applyErrorAction`
      resolution lifecycle gated on retryability). `ErrorCentreView` = unresolved-count banner, source +
      resolution + search filters, and a card list with severity/source/resolution badges, correlation ID,
      affected-order link and per-entry actions (local state, honest "not saved" notices).
    - **Customers** (`/customers` + `/customers/[id]`): `AdminCustomerSummary`/`AdminCustomerProfile` +
      `listCustomers(params)` + `getCustomer(id)` **derived from the order dataset** (reconciled by contact
      email, mirroring the storefront's guest-order association). Pure `lib/customers.ts`
      (`deriveCustomers`/`deriveCustomerProfile`, `customerStatus` new/active/dormant, paid-only spend,
      `filterCustomers`). `CustomersView` = searchable/filterable directory table; `CustomerDetailView` =
      order history (→ order detail) + contact + summary (spend/orders/saved designs); unknown id → not-found.
    - **Analytics** (`/analytics`, new nav item): `AdminAnalytics` + `getAnalytics()` derived from orders.
      Pure `lib/analytics.ts` (`buildDailySeries` 14-day zero-filled bucketing, `statusBreakdown`, bar
      scaling). `AnalyticsView` = KPI cards, an accessible CSS **daily-orders bar chart** (with an sr-only
      data table), an order-status-mix breakdown, and top artwork/garments lists.
  - Nav gained an **Analytics** entry; all routes `noindex`. Still 100% mock — needs TMS-FBR-007 (admin
    error/ops + customer + analytics endpoints).
  - Follow-ups: real error-centre feed (retry/resolve as audited ops actions, correlation-id search across
    systems); real customer records (account status, saved designs via TMS-FBR-005, lifetime value);
    server-computed analytics (funnels, cohorts, date-range controls) once the reporting API lands.
  - **F4 (admin platform) is complete** (001–006). **The F0→F4 PR stack (#4→#5→#6→#7→#8) is now
    merged to `main`** (bottom-up, merge commits, branches deleted; `pnpm check` green on the
    integrated `main`, HEAD `e919e7e`). Active work continues on `claude/f5-post-merge`.

## Phase F5 — Growth & AI (scoped 2026-07-15; TMS-F5-001, -002, -003 Verified)

Scoped from the master prompt §19 (AI interfaces), §20 (editorial & growth) and §29 (phase
definition). **Everything builds on the typed mock adapter** — no growth/AI backend exists yet
(Codex is at B0/B1). New backend gaps: **TMS-FBR-008** (growth/commerce-adjacent endpoints) and
**TMS-FBR-009** (AI endpoints), to be logged in FRONTEND_TO_BACKEND.md as each task lands. Guiding
rule (§20): **prioritise core commerce before future features** — core commerce (F1–F4) is done, so
these are additive. AI surfaces must have a clear assistant identity, honest tool-failure/retry
states, source/product references, a human-support route, **no invented stock/price/delivery
claims**, and **must never auto-publish or auto-act**.

- [x] **TMS-F5-001** Limited drops & countdown
  - Status: **Verified** (2026-07-15) — full `pnpm check` green (format/lint/typecheck/test/build ×2/
    db:validate; **113 storefront tests**, up from 89: +21 drop-domain + 3 provider). Served-route +
    in-browser pass on the live build: `/drops` (200) lists all five sample drops **sorted**
    live → early access → upcoming → sold out → closed, each with the correct status badge and a
    live countdown (or a static label for finished drops); all five detail routes (200) render the
    hero, status, big countdown, early-access panel, story and the drop's pieces; the countdown
    **ticks live** (verified seconds 17→15 in-browser); **no console/hydration errors**; mobile
    375px has **zero horizontal overflow** and the countdown row fits. Unknown drop slug → the
    documented soft-404 (see note below). Nav gained a **Drops** item (header + footer).
  - Scope delivered: pure domain in `lib/drops.ts` (`dropStatus` upcoming/early_access/live/ended/
    sold_out from timestamps + `soldOut`; `dropStatusLabel`/`dropStatusTone`; `nextMilestone` — what
    the countdown targets; `countdownParts`/`countdownLabel`; `sortDrops`) with **24 unit tests**.
    Provider gained `listDrops()` + `getDrop(slug)` (+ api stubs + 3 provider tests) over a 5-drop
    dataset spanning every state, with mock timestamps generated relative to now so the preview
    countdowns are always live. Components: `Countdown` (client, hydration-safe — digits render after
    mount, `role="timer"` accessible summary, reduced-motion safe, no animation deps), `DropCard`,
    `DropStatusBadge`, `DropEarlyAccess` (client — routes guests to sign in, confirms members;
    **UI-only, no real gating/waitlist**, honest preview notices). Routes `/drops` + `/drops/[slug]`
    (+ loading + not-found). Backend gap logged as **TMS-FBR-008**.
  - **Rendering note:** the two drops routes are **`dynamic = 'force-dynamic'`** (request-time) so the
    live status + countdown are never frozen at build — a deliberate divergence from the stable
    catalogue detail routes (static + `dynamicParams=false`). Trade-off: an unknown drop slug is a
    soft 404 under self-hosted `next start` (SEO-only, same residual class as TMS-F1-DEF-001).
  - Follow-ups: real drops API + server-authoritative timeline/inventory (TMS-FBR-008); wire the
    early-access gate + waitlist to real membership/notify (pairs with TMS-F5-002); promote the
    countdown into `packages/ui` if reused; real drop imagery.
- [x] **TMS-F5-002** Waitlist & back-in-stock
  - Status: **Verified** (2026-07-15) — full `pnpm check` green (format/lint/typecheck/test/build ×2/
    db:validate; **119 storefront tests**, up from 113: +6 waitlist). In-browser on the served build:
    the **sold-out product** page (`okada-run-oversized-tee`, flipped to sold_out in the mock) shows
    "Sold out" + a **back-in-stock** form; a valid submit → "You're on the list" and **persists** to
    `localStorage` (`tms.waitlist.v1` → `product:okada-run-oversized-tee`); an invalid email →
    "Enter a valid email address." (`role="alert"`, `aria-invalid`) with success blocked. The
    **sold-out drop** (`comic-line-reprint`) shows "Notify me if it restocks" and the **upcoming
    drop** (`harmattan-editions`) shows the sign-in CTA **plus** "Remind me when it opens" — both
    client-rendered waitlist forms with the preview notice. No console/hydration errors.
  - Scope delivered: pure `lib/waitlist.ts` (`waitlistKey`, `hasEmail`, `addEntry` — case-insensitive
    dedupe, non-mutating; `joinWaitlist` validate + persist with an idempotent already-joined result;
    SSR-guarded `localStorage` wrappers; reuses `isValidEmail`/`normalizeEmail`) with **6 unit tests**.
    Reusable client `WaitlistForm` (labelled email input, `role="alert"` error, success/already-joined
    states, session email prefill, honest "no notification sent" preview notice). Wired into the
    product configurator (sold-out → back-in-stock) and `DropEarlyAccess` (sold-out/ended → restock/
    next-drop; upcoming → "remind me when it opens", alongside the sign-in CTA). Backend gap under
    **TMS-FBR-008** (waitlist/notify + back-in-stock).
  - Follow-ups: real waitlist/notify endpoint + membership-scoped early access (TMS-FBR-008); an
    account view of "things I'm waiting on"; artwork-level back-in-stock once artworks are directly
    purchasable; double-opt-in + unsubscribe when real email lands.
- [x] **TMS-F5-003** Pre-order & made-to-order
  - Status: **Verified** (2026-07-15) — full `pnpm check` green (format/lint/typecheck/test/build ×2/
    db:validate; **129 storefront tests**, up from 119: +10 fulfilment). In-browser on the served
    build: the **product** page (available), the **cart** summary, and the **checkout** order summary
    all show a made-to-order note — "Made to order — printed and finished in 2–4 working days" plus a
    client-computed **ship window** ("Estimated ship 17 Jul–21 Jul", correct working-day maths skipping
    the weekend). **Upcoming/early-access drops** show a **Pre-order** badge and a pre-order note whose
    window starts from the drop's release ("Estimated ship 21 Jul–23 Jul, after the drop opens"), while
    a **live** drop shows the plain made-to-order note. Sold-out product shows the F5-002 back-in-stock
    form instead. No console/hydration errors.
  - Scope delivered: pure `lib/fulfilment.ts` — `addWorkingDays` (UTC, weekend-skipping),
    `madeToOrderWindow`, `preOrderWindow` (production starts when the drop opens), `isPreOrderStatus`,
    `madeToOrderSummary`, `PRODUCTION_LEAD` — with **10 unit tests** (anchored on a known weekday for
    determinism). Client `MadeToOrderNote` (clock-free summary on the server; absolute ship dates
    computed after mount to avoid a hydration mismatch — same pattern as the countdown). Wired into the
    product configurator (not-sold-out), cart summary, checkout order summary, and the drop detail
    (pre-order badge + note for upcoming/early access, made-to-order for live).
  - **Note:** the lead-time is a **frontend estimate** — the real fulfilment timeline is
    server-authoritative (spec "server is authoritative for … shipping"; TMS-FBR-004/008), and a real
    pre-order **reservation** (hold + charge policy) is a backend concern (TMS-FBR-008).
  - Follow-ups: server-authoritative ship estimates + a real pre-order reservation/hold; per-item lead
    times if garments diverge; surface the estimate on the order confirmation + account order detail.
- [x] **TMS-F5-004** Reviews & ratings
  - Status: **Verified** (2026-07-15) — full `pnpm check` green (format/lint/typecheck/test/build ×2/
    db:validate; **164 storefront tests**, up from 151: +13 reviews — 9 lib + 4 mock). In-browser on
    the served build: **product** pages (`midnight-in-lagos-classic-tee`) and **artwork** pages
    (`midnight-in-lagos`) show a **rating summary** (average to 1 dp + fractional star row + count), a
    **5→1 star distribution** with proportional bars, and a **review list** (per-review stars, title,
    author, date, and a **Verified purchase** badge where the seed vouches it). A target with no seed
    reviews (`okada-run-oversized-tee`) shows the **empty state** ("Be the first to review …"). The
    **write-a-review** form validates (star rating 1–5, title ≥3, body ≥10, name), prefills the name
    from the signed-in session, and on submit **prepends the review locally** with a success notice —
    honestly flagged as preview-only (not sent/moderated, never granted the verified badge). No
    console/hydration errors.
  - Scope delivered: pure `lib/reviews.ts` — `summariseReviews` (average + count + per-star
    distribution, clamps out-of-range ratings), `distributionPercents`, `formatAverage`,
    `validateReviewInput` — with **9 unit tests**. `Review`/`ReviewStats`/`ReviewCollection` types +
    `getReviews(targetType, slug)` on the provider (mock seeds product + artwork reviews, empty for
    others; api stub throws; **4 mock tests** incl. stats-match-list + empty-collection). Presentational
    `RatingStars` (fractional fill, a11y label) + client `Reviews` section (summary + distribution +
    list + `WriteReviewForm` with star radio input). Wired into the product and artwork detail pages.
  - **Note:** reviews are **read-only mock data** and writes are **preview-only** (local state, no
    network) — real read/write, the verified-purchase vouch, and **moderation** are backend
    (**TMS-FBR-008**). Skeleton-loading + failure surfaces (from `@tms/ui`) activate on the real async
    API; the deterministic mock exercises the empty/populated/submitting states.
  - Follow-ups: real reviews API + moderation queue (TMS-FBR-008); server verified-purchase check tied
    to orders; helpful-vote + sort/filter; media in reviews; aggregate rating on cards + `AggregateRating`
    structured data for SEO.
- [x] **TMS-F5-005** Community gallery
  - Status: **Verified** (2026-07-16) — full `pnpm check` green (format/lint/typecheck/test/build ×2/
    db:validate; **176 storefront tests**, up from 164: +12 community — 8 lib + 4 mock). In-browser on
    the served build: a new **`/community`** gallery shows the **approved** customer-photo feed (grid of
    handle + caption + artwork link) and a **submit-a-photo** form (artwork picker, handle, caption,
    mock file chooser). Each **artwork** detail page gains a **"Styled by the community"** section
    scoped to that artwork (no picker). The display is **moderation-aware**: seeded **pending/rejected**
    photos (`@pending.user`, `@rejected.user`) **never appear** in the public feed, enforced by a
    single pure filter. Submitting validates (handle/caption/photo), then shows the photo back **only
    to the submitter** as an **"In review"** card with an honest "not uploaded or published, all photos
    moderated" notice. "Community" added to the footer nav. No console/hydration errors.
  - Scope delivered: pure `lib/community.ts` — `isPublic`, `filterApproved`, `moderationLabel`,
    `moderationTone`, `formatHandle`, `validatePhotoSubmission` — with **8 unit tests**.
    `CommunityPhoto`/`ModerationStatus` types + `listCommunityPhotos`/`listArtworkCommunityPhotos` on
    the provider (approved-only, newest first; api stub throws; **4 mock tests** incl. a check that
    pending/rejected are never returned). Presentational `CommunityPhotoCard` + client `CommunityBoard`
    (approved grid + local in-review previews + `SubmitPhoto` form). New static `/community` route;
    section wired into the artwork detail page.
  - **Note:** photos are **placeholder tiles** (no real image upload) and submit is **preview-only**
    (local state, nothing sent/stored) — real UGC intake, storage, and **moderation** are backend
    (**TMS-FBR-008**). The client only ever displays approved photos publicly; the submitter's own
    pending preview is local and never shared.
  - Follow-ups: real image upload + moderation queue + reporting (TMS-FBR-008); like/feature controls;
    pull-through to the homepage; EXIF stripping + content policy on the real upload path.
- [x] **TMS-F5-006** Artwork Passport
  - Status: **Verified** (2026-07-15) — full `pnpm check` green (format/lint/typecheck/test/build ×2/
    db:validate; **140 storefront tests**, up from 129: +11 passport — 7 lib + 4 mock). In-browser on
    the served build (`next start`): a new **per-artwork passport** at `/artworks/[slug]/passport`
    renders a **certificate of authenticity** with an **immutable version id** (`AP-XXXX-XXXX`,
    monospace — e.g. `paper-tigers` → `AP-48FC-BF2C`), edition, an **illustrative serial** for limited
    editions (`No. 042 / 100`), release, and issuer (Tai Manic Studios); an **open edition**
    (`midnight-in-lagos`) shows a different id, "Open edition", and **no** serial line. An **ownership-
    record placeholder** ("No owner is on record yet"), a **provenance timeline**, and a **Share
    passport** control (Web Share → clipboard fallback) all render. The artwork detail page links to it
    ("View passport"). Unknown slugs are a **genuine 404** (SSG + `dynamicParams=false`, same DEF-001
    fix as the detail route). No console/hydration errors.
  - Scope delivered: pure `lib/passport.ts` — `artworkVersionId` (deterministic, content-addressed
    FNV-1a id; same content → same id, any field change → a new version) + `passportSerial`
    (width-padded serial) with **7 unit tests**. `ArtworkPassport`/`ProvenanceEvent` types +
    `getArtworkPassport(slug)` on the provider (mock composes from artwork detail; api stub throws;
    **4 mock tests**). New SSG route `app/artworks/[slug]/passport/page.tsx` (certificate / ownership
    placeholder / share / provenance) + client `PassportShare`. "View passport" link on the artwork
    detail page.
  - **Note:** the version id + serial are a **frontend derivation** for the preview — the
    server-authoritative version id, per-piece serial ledger, and ownership record are a backend
    concern (**TMS-FBR-001** extends artwork data with version + edition fields).
  - Follow-ups: server-authoritative version id + real per-piece serial/ownership ledger (TMS-FBR-001);
    a scannable/verifiable proof (QR / signed link) once the ledger exists; per-purchase passport in
    the account order detail.
- [x] **TMS-F5-007** Shoppable stories
  - Status: **Verified** (2026-07-15) — full `pnpm check` green (format/lint/typecheck/test/build ×2/
    db:validate; **151 storefront tests**, up from 140: +11 stories — 7 lib + 4 mock). In-browser on
    the served build: the **`/stories`** placeholder is replaced by an **editorial journal index** (3
    seeded stories as cards with category, read-time, publish date, and a "N shoppable" badge, newest
    first). Each **`/stories/[slug]`** renders editorial blocks (headings/paragraphs) interleaved with
    **shoppable scenes** — a placeholder scene image carrying **numbered hotspots**; opening a hotspot
    reveals a card linking into the catalogue (**artwork → /artworks**, **product → /products** with
    price, **collection → /collections**, **studio → /design-studio**), each with a distinct CTA
    ("View artwork" / "Shop this piece" / "Explore collection" / "Open in Studio"). Every hotspot is
    **also** listed below the scene ("In this scene") as reachable links — a keyboard/no-JS/screen-
    reader fallback. Unknown story slugs are a **genuine 404** (SSG + `dynamicParams=false`).
    "Stories" added to the primary nav. No console/hydration errors.
  - Scope delivered: pure `lib/stories.ts` — `hotspotHref`, `hotspotActionLabel`, `hotspotKindLabel`,
    `isShoppable`, `storyHotspotTargets`, `countShoppableItems` — with **7 unit tests**. `Story*`/
    `StoryHotspot*` types + `listStories`/`getStory` on the provider (mock seeds 3 stories whose
    hotspot targets are built from the **same** artwork/product/collection data so titles + prices
    never drift; api stub throws; **4 mock tests** incl. a slug-integrity check that every hotspot
    resolves to a real catalogue slug). New SSG routes `app/stories/page.tsx` + `app/stories/[slug]/
page.tsx`, `StoryCard`, and the client `ShoppableScene` (Escape-to-close, one-open-at-a-time,
    flip-above-when-low + horizontal clamp so cards stay in frame).
  - **Note:** stories are **mock/editorial** content on placeholder scene imagery; a real CMS feed can
    map onto the `Story*` shapes, and real scene photography + authored hotspot coordinates would
    replace the placeholders. Hotspot links reuse the existing catalogue routes.
  - Follow-ups: CMS-backed stories + real scene imagery with authored hotspots; add-to-cart directly
    from a product hotspot; tag/related-story navigation; feature the newest story on the homepage.
- [ ] **TMS-F5-008** Studio Guide (customer AI assistant) — chat UI shell: assistant identity,
      suggested prompts, message list, typing/loading, tool-failure + retry, product/Design-Studio
      reference cards, human-support route, and **guardrails** (no invented stock/price/delivery). Mock
      responder only; **TMS-FBR-009** (assistant endpoint + tool results). No auto-actions.
- [ ] **TMS-F5-009** Brand Storyteller (admin AI) — admin draft-generation UI (`apps/admin`): select
      artwork/collection → content type → generate (mock) → compare variants → edit → approve/reject →
      save draft, with generation metadata. **Never auto-publishes.** **TMS-FBR-009** (generation endpoint).
- [ ] **TMS-F5-010** Loyalty & referrals — account loyalty tier/points display, referral link + share
      UI, rewards list + how-it-works, honest "preview" notices. **TMS-FBR-008** (loyalty/referral data).
- _Deferred (per "core commerce first"):_ gift cards, gifting flow, collaborations — add rows if
  prioritised. Sequencing recommendation: **F5-001 → 002 → 003** (drops cluster) first (fully
  mockable, high brand value), then **006/007** (passport/stories), then reviews/community
  (004/005), then the AI shells (008/009) and loyalty (010) which lean hardest on absent backends.

## Phase F6 — Hardening (scoped 2026-07-15; not started)

Scoped from master prompt §29 (F6), §24 (performance), §25 (SEO), §21 (states), §27 (testing),
§28 (visual regression). Largely audit-and-fix + real-API cutover; several tasks partly depend on
Codex delivering endpoints.

- [ ] **TMS-F6-001** Accessibility audit — route-level axe sweeps across all storefront + admin
      routes; keyboard traversal, screen-reader labels, reduced-motion, focus management; fix findings.
- [ ] **TMS-F6-002** Performance audit — measure LCP/INP/CLS against budgets (≤2.5s / ≤200ms / ≤0.1);
      responsive images + modern formats + explicit dimensions + lazy/priority; route code-splitting;
      isolate the Design Studio bundle; skeletons that preserve layout.
- [ ] **TMS-F6-003** Visual review & regression coverage — extend Playwright baselines to gallery,
      artwork detail, collection, shop, product, Design Studio, cart, checkout, account, admin dashboard,
      artwork manager, order detail, production queue (§28); manual diff review; wire into CI once a
      stable render env exists.
- [ ] **TMS-F6-004** Mobile & responsive review — 360/390/430/768/1024/1280/1440; nav, galleries,
      Design Studio, colour/size selectors, sticky actions, data tables, admin forms, modals/drawers,
      image zoom. Mobile is a complete experience, not a reduced desktop.
- [ ] **TMS-F6-005** Cross-browser testing — Chromium / WebKit / Firefox via Playwright on the
      required journeys (§27).
- [ ] **TMS-F6-006** Error-state audit — verify the §21 state matrix (loading/incremental/empty/
      no-results/offline/slow/image-unavailable/API-failure/auth-expired/access-denied/validation/
      inventory-changed/payment-failure/quote-failure/background/maintenance) across every important
      feature; no raw JSON/HTML errors; every error says what happened, what to do, whether data was kept.
- [ ] **TMS-F6-007** Real API replacement — as Codex ships endpoints, swap mock → api adapter per
      surface, add integration tests, verify loading/failure/permission behaviour, remove dead mock
      paths (§26). Depends on backend delivery (TMS-FBR-001…009).
- [ ] **TMS-F6-008** SEO completion — sitemap.xml, robots, canonical + OG/social images, breadcrumbs,
      product structured data + variant relationships, artwork/collection internal linking, slug-change
      redirects, and a full `noindex` coverage audit (admin/account/checkout/private designs). **Includes
      closing the TMS-F1-DEF-001 residual on the chosen production host** (confirm the `fallback: false`
      404 on the real host, or add the self-hosted slug-guard).
- [ ] **TMS-F6-009** Security-facing frontend review — no secrets in client bundles, safe error
      surfaces (no stack traces/secrets, §18), auth/permission gating, admin RBAC readiness (TMS-FBR-006),
      CSP/security-header recommendations.
- [ ] **TMS-F6-010** Staging acceptance & launch checklist — run all required journeys (§27) on
      staging, real-data smoke, sign-off, and a launch checklist.
