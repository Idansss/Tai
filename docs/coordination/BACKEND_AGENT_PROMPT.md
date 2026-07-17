# Prompt for the backend agent (2nd Claude Code, in Cursor)

Copy everything below the line into the other account.

---

You are the **backend engineer** on **Tai Manic Studios (TAI)** — an art-first e-commerce platform
where original African drawings are printed on approved apparel. A second Claude owns the frontend
and is working in parallel **right now**. Stay strictly inside your ownership boundary.

**REPO:** `C:\Users\Admin\Desktop\Tai` (git; main branch `main`, remote `origin` =
https://github.com/Lingz450/Tai).

## Read first, in this order

1. `AGENTS.md` — ownership + the "Verified" bar.
2. `docs/MASTER_PRODUCT_SPEC.md`
3. `docs/DECISIONS.md` — ADR-001…ADR-017. These are binding. ADR-013 (approved placements are the
   only design geometry), ADR-014 (a design is its approved tuple, not quantity), ADR-015 (price
   belongs to the approved artwork+garment pair; integer minor units), ADR-017 (stock is held at
   checkout, never by the cart) are the ones the frontend has already built against.
4. `docs/coordination/FRONTEND_TO_BACKEND.md` — **the most important file for you.** The frontend
   has recorded every contract gap it hit as TMS-FBR-010…021. Several are blocking real screens.
5. `docs/progress/BACKEND_TODO.md` and `.ai/backend-state.json` — your task list and state.
6. `docs/contracts/openapi.yaml` — you own it; it is the source of truth.

## Ownership — DO NOT CROSS

**You own:** `apps/api`, `apps/worker`, `packages/database` (incl. migrations),
`packages/contracts`, `packages/media`, `packages/email`, `infra`, `docs/contracts/openapi.yaml`,
`docs/backend`, `docs/progress/BACKEND_TODO.md`, `docs/handoffs/BACKEND_HANDOFF.md`,
`docs/coordination/BACKEND_TO_FRONTEND.md`, `.ai/backend-state.json`.

**Do NOT touch:** `apps/storefront`, `apps/admin`, `packages/ui`, `packages/site-content`,
`docs/frontend`, `docs/progress/FRONTEND_TODO.md`, `docs/handoffs/FRONTEND_HANDOFF.md`,
`docs/coordination/FRONTEND_TO_BACKEND.md`, `.ai/frontend-state.json`.

`package.json` / `pnpm-lock.yaml` is the one file pair both sessions can collide on. If you must
add a dependency, say so in the PR.

## Current state (2026-07-17)

- **Merged to main:** B0, B1 (customer auth, admin auth + MFA + RBAC), B2 (artwork versions,
  catalogue, garments, media pipeline), B3-001/002 (saved designs, configuration pricing +
  availability), B4-001/002 (inventory + reservations, guest/customer carts + promotions).
- **Your PR #22 is OPEN** — TMS-B4-003 checkout/guest orders/order state machine. Land it first.
- **Frontend PRs open:** #23 (API client foundation, Studio on approved placements, cart UI) and
  #26 (UI direction, stacked on #23). They consume your contracts. Do not break them.

## What is left, excluding payment and delivery

Payment/shipping (**TMS-B5-001/002/003** — PaymentProvider, Flutterwave, ShippingProvider/GIGL)
is explicitly **out of scope for this prompt**. Everything else:

| Task           | What                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **TMS-B3-003** | Idempotent server production renderer + render queue. An approved tuple must always render one exact result.                                                 |
| **TMS-B4-003** | Checkout, guest orders, immutable order snapshots, audited order state machine. **PR #22 — finish and merge.**                                               |
| **TMS-B4-004** | Notifications + cart/order recovery jobs.                                                                                                                    |
| **TMS-B6-001** | Production, print review, QC, reprint, packing, fulfilment APIs.                                                                                             |
| **TMS-B6-002** | Admin metrics, customer/order/payment/integration views, safe retries, reports, CSV exports.                                                                 |
| **TMS-B7-001** | Limited drops, waitlists, pre-orders, wishlists, reviews, community moderation. **The storefront already has all of these built against mocks** — see below. |
| **TMS-B7-002** | Provider-neutral, feature-flagged AI services + approved Studio Guide tools.                                                                                 |
| **TMS-B7-003** | Brand Storyteller drafts + analytics event collection.                                                                                                       |
| **TMS-B8-001** | Security, performance, load, dependency, backup/restore reviews.                                                                                             |
| **TMS-B8-002** | Production deploy: monitoring, queues, health checks, reconciliation, rollback runbooks.                                                                     |
| **TMS-B8-003** | Provider + documentation audit handoff.                                                                                                                      |
| **TMS-B8-004** | Supabase hosting for the shared dev database and object storage.                                                                                             |

## YOUR PRIORITY ORDER — this is not the TODO order

The frontend is blocked or degraded on specific things. Do these first.

### 1. Seed a runnable development database (blocks ALL frontend verification)

**This is the single highest-value thing you can do.** The local Postgres (`tai-postgres-1`, host
port **5433**, not 5432) contains **only the B1 identity tables**. The B2/B3/B4 migrations exist in
`packages/database` but are **not applied**, so a locally-run API cannot serve `/api/v1/artworks`
and the frontend has verified its entire API client against **stubs only**. Nobody has ever
exercised these endpoints against a real server.

Deliver:

- A single documented command that migrates **and seeds** a working local database.
- Seed data that mirrors the real catalogue: artworks with published versions, at least one
  collection/drop/story, garment templates with colours/sizes/variants/placements/scale presets,
  approved artwork↔garment compatibilities, inventory, and a promotion code.
- The artwork slugs the storefront already uses: `midnight-in-lagos`, `paper-tigers`,
  `harmattan-bloom`, `lantern-keeper`, `the-getaway`, `rainy-season`, `market-day`, `okada-run`.
- Confirm in `BACKEND_TO_FRONTEND.md` that `DATA_SOURCE=api` now works end to end.

**Do not migrate the shared DB without saying so** — the frontend agent uses the same container.

### 2. TMS-FBR-011 + TMS-FBR-012 — the artwork gallery cannot show price or availability

The highest-traffic surface is stuck on mocks because of these two.

- **TMS-FBR-011:** `/api/v1/artworks` carries **no price**. ADR-015 puts price on the approved
  artwork+garment pair, so an artwork has no single price — but every gallery card shows "from
  ₦X". Resolving it client-side would need a `/garment-configurations/validate` call per artwork
  per garment, which is not viable for a grid. **Add `startingPrice: Money | null`** to the artwork
  list/detail response — the server-side minimum across approved pairs.
- **TMS-FBR-012:** `/api/v1/artworks` carries **no availability** and accepts no `availability`
  filter, but the gallery has both a filter and a per-card badge. Note the frontend understands
  `AVAILABLE` means "the catalogue permits this sale", not "in stock" — the card needs the
  derived, sellable-now view. Add an availability state to the artwork read model **plus** the
  filter, or tell the frontend to drop the control.

The frontend currently renders `null` for both rather than inventing numbers. It will not fake a
price. Until you ship these, the gallery stays mocked.

### 3. TMS-FBR-020 — a cart line cannot be rendered from its own response

`CartLine` is **entirely identifiers** (`artworkId`, `garmentTemplateId`, `garmentVariantId`,
`placementId`, `scalePresetId`) with no title, garment name, colour, size or image. The cart
response alone cannot render "Market Day on a Black Classic T-shirt, size M" — the one thing a bag
must say. `DesignConfigurationSummary` has the same problem.

Worse: **the public catalogue reads are slug-addressed** (`/artworks/{slug}`, `/garments/{slug}`)
**while cart and design responses reference ids**. There is no id-based public read, so a client
cannot resolve one line without listing the whole catalogue.

The frontend built `lib/cart-view.ts` as an interim, joining labels from `/artworks` + `/garments`.
It works, but the cart page pulls the catalogue to render two lines.

**Add a display projection** to the cart line and to a saved design — artwork title + slug, garment
title, colour name, size label, placement name, scale name, thumbnail. You already have all of it
at read time. (An alternative is `GET /cart?expand=display`.) **Decide and tell the frontend**,
because if you ship this their interim layer gets deleted.

### 4. TMS-FBR-017 — confirm the slug/id asymmetry

`DesignConfigurationInput.scalePreset` is a **kebab-case slug**, while `artworkVersionId`,
`garmentVariantId` and `placementId` are **UUIDs** — and a cart line reads back `scalePresetId`.
So a client sends a slug and reads an id for the same thing. The frontend implemented it exactly as
specified but flagged it as easy to get wrong. **Confirm it is intentional**, and state explicitly
whether `scalePresetId` on a cart line is the preset's UUID or its slug — they currently round-trip
the slug.

Also confirm: the frontend reads placement permille (`xPermille`/`yPermille`/`widthPermille`/
`heightPermille`) as a **top-left corner + size** and centres the print on that box. Say so if that
is wrong.

Also: the frontend **drops** approved placements whose `view` is `LEFT`/`RIGHT` because the Studio
preview only draws front and back. If those views are meant to be sellable, say so.

### 5. TMS-B7-001 — the storefront's growth features are all mock-backed

The storefront has **already shipped the UI** for limited drops, waitlists, pre-orders, wishlists,
reviews, community photos and loyalty, all against typed mocks. Two of these have endpoints that
the frontend still cannot use, recorded as:

- **TMS-FBR-018:** `/drops` carries no `tagline`, `pieceCount` or server-authoritative `soldOut`;
  `DropSummary` needs them.
- **TMS-FBR-019:** `/stories` carries no `category`, `readMinutes` or `shoppableCount`.

Read `FRONTEND_TO_BACKEND.md` for the exact shapes the UI already expects, and either serve them or
tell the frontend to remove the fields.

### 6. TMS-FBR-010 — decide what a "product" is

A storefront "product" is an artwork applied to a garment. **There is no `/products` endpoint.**
Either publish a composed product read model, or confirm client-side composition is intended so the
frontend builds it deliberately. Right now `listProducts`/`getProduct` throw.

### 7. Everything else, in TODO order

TMS-B3-003 → TMS-B4-004 → TMS-B6-001 → TMS-B6-002 → TMS-B7-002/003 → TMS-B8-*.

## Contract rules you have already fixed — do not regress them

The frontend has built against these and they are load-bearing:

- Money is integer minor units + explicit currency. Never floats. NGN/kobo.
- `POST /cart/items` takes the approved tuple + quantity. A browser-supplied `unitPriceMinor` is a
  **400**. Totals are server-computed.
- Anonymous carts work with no session (`tms_cart` guest cookie). Signing in auto-merges on the
  next cart read — no merge call.
- A cart line keeps its `issue` (`OUT_OF_STOCK` | `INSUFFICIENT_STOCK` |
  `CONFIGURATION_NOT_APPROVED` | `DROP_NOT_OPEN` | `DROP_ENDED` | null). Unavailable lines are
  **kept** and excluded from the subtotal. `cart.hasIssues` blocks checkout.
- Nothing is reserved by the cart (ADR-017). `availableQuantity` is sellable-now, not held.
- Saving a design is idempotent: **201 new, 200 existing**. 200 is success.
- A resource you do not own returns **404, never 403**.
- Promotions: invalid = **422 PROMOTION_INVALID** with ONE message for unknown/ended/unlaunched.
  Valid-but-unqualifying = **200 with `promotion: null`**.
- Opaque HttpOnly session cookies (`tms_session`, `tms_admin_session`). Never readable by JS.

## Verification bar — a task is not done until all of this is true

`pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm db:validate`
all pass, **and CI is green on your PR**. Integration tests run against disposable PostgreSQL, not
mocks (ADR-006). Update `docs/contracts/openapi.yaml` and `packages/contracts` together — they are
the interface. Record every frontend-impacting change in `docs/coordination/BACKEND_TO_FRONTEND.md`
with the compatibility note and the concrete frontend action.

**Do not claim something works against a live API unless you ran it against one.** The frontend's
entire integration is stub-verified because no seeded database exists; do not repeat that.

## Workflow

- **Never work on `main`.** Branch from the latest `main`, one branch per task
  (`codex/b4-004-notifications`, etc.).
- One reviewable PR per task. Commit and push early; never accumulate uncommitted work.
- Land **PR #22 first** — nothing should stack on an unmerged checkout.
- Keep `BACKEND_TODO.md`, `BACKEND_HANDOFF.md`, `.ai/backend-state.json` and
  `BACKEND_TO_FRONTEND.md` current as you go.

## CI note

`pnpm audit` fails against npm's retired endpoint; CI already runs it via
`corepack pnpm@11.13.0`. If your branch predates that fix, merge latest `main` rather than
"fixing" audit.

## Start here

1. Read `docs/coordination/FRONTEND_TO_BACKEND.md` end to end.
2. Get **PR #22** green and merged.
3. Then do **priority 1** (seed a runnable dev database) before any new feature. Every frontend
   claim about your API is currently unverified, and that is the biggest risk on the project.
