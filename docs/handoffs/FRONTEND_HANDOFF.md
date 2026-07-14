# Frontend Handoff

## Current frontend phase

F3 — Commerce & account. TMS-F3-001 (cart) + TMS-F3-002 (checkout) + TMS-F3-003 (payment states)
**Verified** (2026-07-15). Branch `claude/f3-commerce`
is **stacked on `claude/f2-design-studio` → `claude/f1-storefront` → `claude/f0-visual-foundation`**
— merge F0 (#4) → F1 (#5) → F2 (#6) first. F3 opens as a stacked PR with base
`claude/f2-design-studio`. Nothing is merged to `main` yet.

### F3 progress this session

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
-005, -007, -008, -009; TMS-F2-001; TMS-F3-001; TMS-F3-002; **TMS-F3-003**.

## In-progress task

None active. F0-002, F0-010, F1-006 remain `Implemented` (not `Verified`).

## First recommended next task

**TMS-F3-004** (auth: registration/login mock session) **or** **TMS-F3-005** (account: orders list,
order detail + tracking, saved designs, wishlist — the order snapshots + status from F3-003 feed
straight into it) **or** the tracked soft-404 defect TMS-F1-DEF-001.

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

- **TMS-F1-DEF-001** — soft 404: `/artworks/[slug]` returns HTTP 200 instead of 404 for unknown
  slugs under the Next 16 Turbopack production server (correct not-found UI still renders).
  `notFound()` used correctly; the streamed shell commits 200 first. SEO impact only.
- F0 follow-ups outstanding: Base44 PNG screenshots, Playwright baselines.

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
