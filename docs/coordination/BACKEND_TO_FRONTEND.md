# Backend to Frontend

# Frontend Foundation Ready

## Status

Stage B0 has been merged into `main`.

## Claude Code starting branch

Create the branch from the latest `main`:

```bash
git checkout main
git pull --ff-only origin main
git checkout -b claude/f0-visual-foundation
```

## Frontend-owned directories

- apps/storefront/
- apps/admin/
- packages/ui/
- docs/frontend/
- docs/progress/FRONTEND_TODO.md
- docs/handoffs/FRONTEND_HANDOFF.md
- .ai/frontend-state.json

## Shared contracts available

- API success and error envelopes
- Pagination contracts
- Order status values
- Payment status values
- Shipping status values
- Design Studio configuration input
- Liveness response
- Readiness response

## Available backend endpoints

- GET /api/v1/health/live
- GET /api/v1/health/ready
- Swagger UI: /api/docs
- OpenAPI JSON: /api/docs/openapi.json

## Important limitation

Domain APIs, authentication, catalogue, cart, checkout, payment and shipping APIs are not implemented yet. Claude Code should use typed mock adapters matching `packages/contracts` and replace them as backend endpoints become available.

## 2026-07-14 — B0 baseline

- Added the initial API envelope, public error codes, pagination query, order/payment/shipping statuses, and Design Studio configuration input in `packages/contracts`.
- Added liveness and readiness endpoints under `/api/v1/health`.
- Added the OpenAPI baseline at `docs/contracts/openapi.yaml`.
- Compatibility: additive; no previous contract existed.
- Frontend action: create `claude/f0-visual-foundation` from the latest `main` and use typed mock adapters for unimplemented domain APIs.

## 2026-07-14 — TMS-B1-001 identity persistence

- Added backend-only persistence for users, profiles, sessions, verification/reset tokens, RBAC, and immutable audit records.
- Compatibility: no public endpoint, OpenAPI, or `packages/contracts` change.
- Frontend action: none. Continue using typed mock authentication adapters until TMS-B1-002 publishes the authentication contract.

## 2026-07-16 — TMS-B1-002 customer authentication

- Status: Verified and merged through PR #10 as `88801c1374415eddf318a95e56ac3be7ab864c98`; ready for frontend consumption.
- Compatibility: additive. Existing health and shared baseline contracts are unchanged.
- Authentication transport: opaque `tms_session` HttpOnly cookie. Browser code must use credentialed same-origin requests and must not attempt to read or persist the token.
- Added endpoints:
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/logout`
  - `POST /api/v1/auth/email-verification/request`
  - `POST /api/v1/auth/email-verification/confirm`
  - `POST /api/v1/auth/password-reset/request`
  - `POST /api/v1/auth/password-reset/confirm`
  - `GET /api/v1/auth/session`
  - `DELETE /api/v1/auth/sessions/:sessionId`
  - `DELETE /api/v1/auth/sessions`
- Registration requires `email`, a 12–128 character `password`, and optional `displayName`. It returns the customer plus `verificationRequired: true`.
- Login and verification confirmation return `{ data: { session }, meta }` and set the cookie. Logout and session deletion return `204`.
- Verification/reset request endpoints always return `{ data: { accepted: true }, meta }` for known and unknown email addresses.
- Added public error codes: `AUTHENTICATION_INVALID`, `EMAIL_VERIFICATION_REQUIRED`, `TOKEN_INVALID_OR_EXPIRED`, and `SESSION_INVALID`.
- Frontend action: replace typed mock customer authentication when the PR merges; add `/account/verify-email` and `/account/reset-password` handlers that read the one-time `token` query parameter and submit it to the corresponding confirm endpoint. Do not expose different recovery UI for known vs unknown email addresses.

## 2026-07-16 — TMS-B1-003 administrator authentication and RBAC

- Status: Verified and merged through PR #11 as `30bd5c087baf0f9b281f5422d43e5c54e26ace94`; ready for frontend consumption.
- Compatibility: additive. Customer auth and health contracts are unchanged.
- Authentication transport: opaque `tms_admin_session` HttpOnly cookie, distinct from `tms_session`. Use credentialed same-origin requests; never read, copy, or persist either session token in browser code.
- Added auth endpoints:
  - `POST /api/v1/admin/auth/login`
  - `POST /api/v1/admin/auth/mfa/enroll`
  - `POST /api/v1/admin/auth/mfa/enroll/confirm`
  - `POST /api/v1/admin/auth/mfa/verify`
  - `POST /api/v1/admin/auth/logout`
  - `GET /api/v1/admin/auth/session`
  - `DELETE /api/v1/admin/auth/sessions/:sessionId`
- Added access endpoints:
  - `GET /api/v1/admin/access/roles` (`users.read`)
  - `PUT /api/v1/admin/access/users/:userId/roles/:roleCode` (`system.manage` + MFA)
  - `DELETE /api/v1/admin/access/users/:userId/roles/:roleCode` (`system.manage` + MFA)
- Login accepts `email`/`password` and returns either `{ data: { session }, meta }` with the cookie, or `{ data: { challenge }, meta }`. Challenge `status` is `MFA_ENROLLMENT_REQUIRED` or `MFA_REQUIRED`; submit its 43-character `challengeToken` to the corresponding MFA endpoint. Enrollment returns a one-time base32 `secret` and `otpauthUri`; confirmation/verification accepts a six-digit `code` and then sets the cookie.
- The session includes `id`, `expiresAt`, `assuranceLevel`, and `user: { id, email, name, roles, permissions, mfaRequired, mfaEnrolled }`. Route and action visibility may use roles/permissions for UX, but the API remains authoritative.
- Added error codes: `ADMIN_MFA_REQUIRED`, `MFA_CHALLENGE_INVALID`, and `MFA_CODE_INVALID`. Existing `AUTHENTICATION_INVALID`, `SESSION_INVALID`, `PERMISSION_DENIED`, `RESOURCE_NOT_FOUND`, `CONFLICT`, `VALIDATION_FAILED`, and `RATE_LIMITED` also apply.
- Frontend action: replace the mock `localStorage` staff session with login/session/logout calls, delete `tms.admin.session.v1` during migration, render the MFA enrollment/challenge step when returned, and gate navigation from the session's permissions. Never treat client-side gating as authorization.

## 2026-07-16 — TMS-B2-001 artwork roots and immutable versions

- Status: implemented on `codex/b2-artwork-versions`; consume after its focused PR is merged.
- Compatibility: additive. Authentication, access, and health contracts are unchanged.
- Public endpoints:
  - `GET /api/v1/artworks?cursor=<uuid>&limit=20`
  - `GET /api/v1/artworks/:slug`
- Administrator endpoints:
  - `GET /api/v1/admin/artworks?cursor=<uuid>&limit=20&status=DRAFT|PUBLISHED|ARCHIVED` (`catalogue.read`)
  - `GET /api/v1/admin/artworks/:artworkId` (`catalogue.read`)
  - `POST /api/v1/admin/artworks` (`catalogue.write`)
  - `POST /api/v1/admin/artworks/:artworkId/versions` (`catalogue.write`)
  - `POST /api/v1/admin/artworks/:artworkId/versions/:versionId/publish` (`catalogue.write`)
  - `POST /api/v1/admin/artworks/:artworkId/versions/:versionId/archive` (`catalogue.write`)
  - `POST /api/v1/admin/artworks/:artworkId/archive` (`catalogue.write`)
- Artwork creation accepts lowercase kebab-case `slug`, `title`, optional `shortStory`, `story`, `inspiration`, and optional JSON-object `metadata`. Creating a replacement accepts the same fields except `slug` and always inserts the next immutable draft version.
- Responses expose root lifecycle/timestamps plus `publishedVersion`; administrator records additionally expose the complete newest-first `versions[]` history. Version fields are `id`, `versionNumber`, `status`, content/metadata, and lifecycle timestamps.
- Public endpoints return only published roots and the exact published version. A draft/archived slug returns `RESOURCE_NOT_FOUND`. Publishing a version archives the prior publication; archiving the published version or root removes it from public reads.
- There are intentionally no version update/delete endpoints. Treat IDs/content as immutable and create a new version for edits.
- Delivery boundary: this is the core of TMS-FBR-001, not the complete gallery view model. Collection/tag/filter/sort fields arrive in TMS-B2-002; preview/image/process assets arrive in TMS-B2-004. Continue the typed mock adapter for those missing fields and do not synthesize them from `metadata`.

## 2026-07-16 — TMS-B2-002 catalogue discovery and editorial content

- Status: implemented on `codex/b2-catalogue-content`; consume after its focused PR is merged.
- Compatibility: additive. Existing artwork, authentication, access, and health operations remain stable. `GET /api/v1/artworks` gains optional filters and additive `tags`, `collections`, `drops`, and `editions` fields.
- Public discovery:
  - `GET /api/v1/artworks?cursor=<uuid>&limit=20&q=<text>&collection=<slug>&drop=<slug>&tag=<slug>&theme=<slug>&mood=<slug>&colourFamily=<slug>&limitedEdition=true&sort=newest`
  - `GET /api/v1/collections?cursor=<uuid>&limit=20`
  - `GET /api/v1/collections/:slug`
  - `GET /api/v1/drops?cursor=<uuid>&limit=20`
  - `GET /api/v1/drops/:slug`
  - `GET /api/v1/stories?cursor=<uuid>&limit=20`
  - `GET /api/v1/stories/:slug`
- Administrator catalogue operations live under `/api/v1/admin/catalogue`: CRUD for `tags`, `collections`, `drops`, `editions`, and `stories`; tag/collection/drop artwork associations use nested `PUT`/`DELETE` routes. Reads require `catalogue.read`; mutations require `catalogue.write`.
- Tag kinds are `GENERAL`, `THEME`, `MOOD`, and `COLOUR_FAMILY`. Multiple supplied artwork filters compose with AND semantics. Text search is case-insensitive across the exact published version's title, short story, story, and inspiration.
- Collections and drops expose ordered `{ artworkId, position }` membership. Public responses omit draft/archived containers and omit unpublished artwork roots even when an administrator associated them with a published container.
- Editions expose `name`, optional positive `totalQuantity`, `numbered`, lifecycle `status`, and `releasedAt`; numbered editions require a total quantity. `limitedEdition=true` means at least one published edition exists.
- Stories expose optional `artworkId` or `collectionId` (never both), lifecycle fields, and ordered blocks with type `TEXT`, `IMAGE`, `QUOTE`, or `EMBED` plus object-shaped `content`.
- Media URLs/previews remain TMS-B2-004. Garment templates/variants/compatibility remain TMS-B2-003. Waitlists, preorder behavior, purchase limits, and inventory are not implied by a drop or edition and remain later commerce/growth work.

## 2026-07-16 — TMS-B2-003 approved garment canvases

- Status: implemented on `codex/b2-garment-catalogue`; consume after its focused PR is merged.
- Compatibility: additive. Existing artwork, catalogue, authentication, access, and health operations remain stable. The public error catalogue adds `CONFIGURATION_NOT_APPROVED` for an invalid exact tuple.
- Public operations:
  - `GET /api/v1/garments?cursor=<uuid>&limit=20&type=<GarmentType>`
  - `GET /api/v1/garments/:slug`
  - `GET /api/v1/artworks/:slug/compatible-garments`
  - `POST /api/v1/garment-configurations/validate`
- Administrator operations live under `/api/v1/admin/garments`. Reads require `catalogue.read`; mutations require `catalogue.write`. They cover template create/read/update/delete plus nested colours, measured sizes, colour/size SKU variants, normalized view placements, scale presets, and exact artwork-version compatibility decisions.
- Garment types are `CLASSIC_TSHIRT`, `OVERSIZED_TSHIRT`, `LONG_SLEEVE`, `HOODIE`, `SWEATSHIRT`, `TOTE_BAG`, `CAP`, and `ART_PRINT`. Views are `FRONT`, `BACK`, `LEFT`, and `RIGHT`.
- Public garment records contain only published colours, sizes/measurements, variants, placements, and scale presets. Normalized placement coordinates use integer permille values in a 1000-by-1000 canvas; `printWidthMm` and `printHeightMm` preserve physical output dimensions.
- Compatibility is approved against an exact immutable `artworkVersionId`, a template, and an allowlist of published placement IDs. Publishing a replacement artwork version does not inherit the prior version's approval. Published template structure cannot change until the template is archived; leaving publication archives its current approvals.
- Configuration validation requires `{ artworkVersionId, garmentVariantId, placementId, scalePreset, view, quantity? }` and returns the resolved IDs with `valid: true`. Treat `422 CONFIGURATION_NOT_APPROVED` as an unavailable selection and refresh compatibility; never infer compatibility client-side.
- Inventory quantities, stock status, price, and reservations remain TMS-B4. Media URLs, artwork originals, derivatives, and mockups remain TMS-B2-004. Continue typed adapters for those absent fields.

## 2026-07-16 — TMS-B2-004 exact-version media

- Status: implemented on `codex/b2-media-pipeline`; consume after its focused PR is merged.
- Compatibility: additive. Existing artwork/catalogue/garment fields and operations remain stable. Error codes add `MEDIA_VALIDATION_FAILED`, `MEDIA_INFECTED`, and `MEDIA_PROCESSING_FAILED`.
- Public operation: `GET /api/v1/artworks/:slug/media` returns only `READY` web derivatives/thumbnails and `APPROVED` mockups for the exact published version. Originals, queued/failed assets, and pending/rejected mockups never appear.
- Administrator operations list exact-version assets; upload one multipart `file` original; upload a multipart mockup with `file`, `garmentTemplateId`, and `garmentPlacementId`; approve/reject mockups; and retry failed originals. Reads require `catalogue.read`; writes require `catalogue.write`.
- Each `MediaAsset` includes kind/variant, filename/MIME/bytes/dimensions, alpha, SHA-256, dominant colour, `lowResolution`, processing/approval/failure state, optional garment IDs, creation time, and a short-lived signed `url`. Do not persist or infer signed URLs.
- A successful original upload means storage and the persistent derivative job were recorded; `QUEUED`/`PROCESSING` is expected until the worker creates `WEB_DERIVATIVE` and `THUMBNAIL`. Treat failures as retryable administration state, not as a usable preview.
- Production-print assets and configuration renders are deliberately absent and remain TMS-B3-003. A browser derivative or approved mockup must never be sent to production.

## 2026-07-16 — TMS-B3-001 design configurations: Studio geometry is approval-bound

- Status: decided (ADR-013); the backend design-configuration surface is being implemented against this shape.
- **Breaking for the Studio mock, not for any shipped API.** `apps/storefront/lib/studio.ts` models a design as freeform `printX`/`printY`/`printWidth` plus `cropZoom`/`cropX`/`cropY`. The backend will never accept those fields.
- A design is exactly `{ artworkVersionId, garmentVariantId, placementId, scalePreset, view, quantity }` — the same tuple `POST /api/v1/garments/configuration/validate` already validates today. `packages/contracts` `DesignConfigurationInputSchema` is authoritative.
- Required Studio change: replace the freeform transform and crop controls with a picker over the approved placements and scale presets returned for the selected artwork version and garment template. Do not send geometry the server cannot approve; it will be rejected with `422 CONFIGURATION_NOT_APPROVED`.
- Rationale: an administrator approves an exact placement, not a region. Freeform geometry would let a customer position or scale artwork into a print that was never approved and cannot be quality-checked for DPI. Sharing, pricing, and production rendering all key off the approved tuple.
- Shareable Studio URLs should carry the approved IDs rather than percentages. Existing `printX`/`printY`/`printWidth`/`crop*` query parameters have no server meaning and should be dropped rather than translated.

## 2026-07-16 — TMS-B3-001 saved designs are available

- Status: implemented on `codex/b3-design-configurations`; consume after its PR is merged.
- Compatibility: additive. No existing operation changes. Six new operations: `GET/POST /api/v1/designs`, `GET/PATCH/DELETE /api/v1/designs/{id}`, `POST /api/v1/designs/{id}/share`, and public `GET /api/v1/shared-designs/{token}`.
- **This replaces the saved-designs mock in `apps/storefront/lib/account.ts` and the share behaviour in the Design Studio.** Requires an authenticated customer session cookie (`tms_session`); an administrator session is a different audience and is rejected.
- `POST /api/v1/designs` takes the approved tuple only: `{ artworkVersionId, garmentVariantId, placementId, scalePreset, view, name? }`. Sending `printX`/`printY`/`printWidth`/`crop*` is a `400`, and an unapproved placement, unpublished artwork version, or unknown scale preset is `422 CONFIGURATION_NOT_APPROVED`. See ADR-013.
- Saving is idempotent: `201` for a new design, `200` with the existing design for an identical tuple. Do not treat `200` as an error or create a duplicate locally.
- Quantity is not part of a saved design (ADR-014). Keep quantity in cart state; it arrives with the cart in TMS-B4-002.
- Sharing: a design is `PRIVATE` (no `shareToken`) or `UNLISTED` (with one). `POST /designs/{id}/share` publishes or rotates a link — **rotating immediately breaks the previous URL**, so surface that in the UI. `PATCH { visibility: 'PRIVATE' }` revokes. `GET /shared-designs/{token}` is public, returns `shareToken: null`, and never exposes the owner.
- Reading a design you do not own returns `404`, not `403`. Do not render a "forbidden" state; treat it as not found.
- Still absent and not to be faked: price, availability, stock (TMS-B3-002 and TMS-B4-001) and production renders (TMS-B3-003). Keep typed adapters for those fields.

## 2026-07-16 — TMS-B3-002 server-authoritative price and availability

- Status: implemented on `codex/b3-pricing-availability`; consume after its PR is merged.
- Compatibility: additive to `POST /api/v1/garment-configurations/validate`, which now also returns `unitPrice`, `totalPrice`, and `availability`. No operation is removed or renamed.
- **Money is integer minor units, never a float.** `{ amountMinor: 1400000, currency: 'NGN' }` is ₦14,000. This matches `priceMinor`/`currency: 'NGN'` already used in `apps/storefront/lib/cart.ts` and `lib/data/mock.ts`, so the existing frontend shape is correct — only its source changes from mock to API.
- **`totalPrice` is computed by the server.** Do not multiply on the client and do not send a price; a browser-supplied amount is never consulted. Keep the preview subtotal helpers for optimistic display only, and always show the server total at checkout.
- Price lives on the approved artwork-and-garment pair (ADR-015). Administrators set it when approving, so `PUT /api/v1/admin/garments/{templateId}/compatibilities/{artworkVersionId}` now requires `unitPriceMinor` and `currency` when `status: 'APPROVED'` and rejects them otherwise. **This affects the admin garment/compatibility screens.**
- `availability.state` is one of `AVAILABLE`, `DROP_NOT_OPEN`, `DROP_ENDED`, or `EDITION_EXHAUSTED`, with `opensAt`/`closesAt` when a drop bounds it. Use these for the countdown and sold-out states rather than inferring from dates client-side.
- **`AVAILABLE` does not mean in stock.** It means the catalogue permits the sale. Stock arrives with TMS-B4-001 and will refine this; do not present it as "in stock" yet.
- `EDITION_EXHAUSTED` is in the contract but not yet reachable: edition counts need sold quantities from TMS-B4-003. Handle it, but do not expect it.

## 2026-07-16 — TMS-B4-001 garment inventory is available

- Status: implemented on `codex/b4-inventory-reservations`; consume after its PR is merged.
- Compatibility: additive. Six new administrator operations under `/api/v1/admin/inventory`, no existing operation changed.
- **This replaces the stock matrix mock in the admin garment/inventory screens.** Reads need `inventory.read`; receipts, adjustments, and thresholds need `inventory.write`. Fulfilment operators and store administrators have both; analysts have read only; **content managers have no inventory access at all**, so hide the section for them rather than letting it 403.
- A stock level is `{ variantId, sku, onHand, reserved, available, lowStockThreshold, lowStock }`. `available` is `onHand - reserved`. **Do not compute stock client-side** — a hold reduces `available` without changing `onHand`, and only the server knows which holds are still live.
- `GET /api/v1/admin/inventory?lowStockOnly=true` powers the low-stock alert list. Use `lowStock` rather than re-deriving it from the threshold.
- Adjustments require a `reason`; the API rejects a zero `quantityDelta`, an adjustment below zero (`400 VALIDATION_FAILED`), and an adjustment that would drop stock below what is already reserved (`409 INVENTORY_UNAVAILABLE`). Surface that conflict as a real message: it means someone is mid-purchase, not that the input was malformed.
- `GET /api/v1/admin/inventory/{variantId}/movements` is an append-only ledger. There is deliberately no edit or delete: stock history cannot be rewritten. Do not build an edit affordance.
- **Stock is not public yet.** There is no customer-facing stock endpoint, and `availability` from `garment-configurations/validate` still means "the catalogue permits this sale", not "in stock". Keep any storefront stock display on typed adapters until that follow-up lands.

## 2026-07-16 — TMS-B4-002 the cart API is available

- Status: implemented on `codex/b4-cart`; consume after its PR is merged. This answers request TMS-FBR-003.
- **This replaces `apps/storefront/lib/cart.ts` mock state and the cart drawer/page data.** Six operations: `GET /api/v1/cart`, `POST /api/v1/cart/items`, `PATCH|DELETE /api/v1/cart/items/{lineId}`, `POST|DELETE /api/v1/cart/promotion`.
- **Anonymous carts work.** No session needed; the API issues a `tms_cart` guest cookie on first contact. Send credentials/cookies on every cart call. Signing in merges the guest cart into the customer's automatically on the next cart request — no explicit merge call.
- **Never send a price.** `POST /cart/items` takes the approved tuple plus `quantity`; an extra `unitPriceMinor` is a `400`. Totals are server-computed. The existing `subtotalMinor`/`discountMinor` preview helpers may stay for optimistic rendering, but the cart page must show the server's numbers.
- Line identity is the approved tuple, so adding the same configuration twice merges quantities onto one line. Your `lineId()` helper keys on `printX`/`crop*`, which no longer exist (ADR-013) — drop them.
- **`issue` on a line is the important field.** It is `OUT_OF_STOCK`, `INSUFFICIENT_STOCK`, `CONFIGURATION_NOT_APPROVED`, `DROP_NOT_OPEN`, or `DROP_ENDED`, and `null` when purchasable. Unavailable lines are **kept and excluded from the subtotal**, not deleted — render them as "no longer available" with the reason. `hasIssues` tells you to block checkout.
- **Nothing is reserved by the cart (ADR-017).** `availableQuantity` is what is sellable right now, not what is held for this shopper. Do not show a countdown or promise the units; the hold happens at checkout.
- Promotions: `POST /cart/promotion` with `{ code }`. An invalid code is `422 PROMOTION_INVALID` with one message for unknown/ended/unlaunched — do not try to distinguish them in the UI. A valid code that does not qualify (below its minimum) returns `200` with `promotion: null`; say "code doesn't apply to this order" rather than showing an error.
- `total` is `subtotal - discount`, never below zero. **Delivery and tax are deliberately absent** and belong to the checkout quote (TMS-B4-003), exactly as TMS-FBR-003 requested.
- A line you do not own returns `404`, not `403`.

## 2026-07-17 — A seeded, runnable dev database exists — `DATA_SOURCE=api` now works end to end

- Status: implemented on `codex/dev-seed`; consume after its PR merges. This unblocks all frontend
  verification — until now every claim about these endpoints was **stub-verified only** because
  no seeded database existed.
- **What changed:** `packages/database/prisma/seed.ts` now also seeds a full development catalogue
  (new file `prisma/seed-catalogue.ts`). One documented command migrates and seeds a working local
  database. See `docs/backend/DEV_DATABASE.md`.
- **The single command** (run from the repo root, against the local Docker Postgres on host port
  **5433**):

  ```bash
  DATABASE_URL="postgresql://tai:local_development_only@localhost:5433/tai_dev?schema=public" \
    pnpm --filter @tms/database db:reset
  ```

  `db:reset` runs every migration then the seed. `db:migrate` (deploy only) and `db:seed` (seed
  only) also exist. Point the API at the same `DATABASE_URL` and it serves this data.

- **Important — use `tai_dev`, not `tai_manic`.** The pre-existing `tai_manic` database in the
  same container carries a _stale, incompatible_ Prisma migration history (`20260711_*`) from an
  earlier iteration and would fail `migrate deploy` on drift. The seed command creates and uses a
  clean `tai_dev`; `tai_manic` is left untouched.

- **Seed contents** (mirrors the storefront):
  - All eight artwork slugs the storefront uses — `midnight-in-lagos`, `paper-tigers`,
    `harmattan-bloom`, `lantern-keeper`, `the-getaway`, `rainy-season`, `market-day`, `okada-run`
    — each PUBLISHED with one published version.
  - Three garment templates: `classic-tee` (₦14,000), `heavyweight-hoodie` (₦28,000),
    `canvas-tote` (₦9,000), with colours, sizes, variants, front/back placements, and scale
    presets (`standard`/`medium`/`small`). Prices are integer kobo on the approved pair (ADR-015).
  - Approved, priced compatibilities for every artwork on the tee + hoodie (tote for `market-day`
    and `okada-run`), each with its placement allowlist.
  - Inventory on every variant: most healthy (40), one **low-stock** example
    (`heavyweight-hoodie` / Ash / XL = 3, threshold 5) and one **out-of-stock** example
    (`classic-tee` / White / XL = 0) so you can exercise `lowStock` and the `OUT_OF_STOCK` line
    `issue`.
  - Two collections (`lagos-nights`, `seasons`), one live drop (`harmattan-2026`), one shoppable
    story (`making-of-market-day`), one limited edition, and two promotion codes: **`STUDIO10`**
    (10% off) and **`WELCOME`** (₦2,000 off, min subtotal ₦10,000).

- **Verified end to end against a live API** (first time these endpoints have run against a real
  server, not a stub): `GET /artworks` → 8 items; `GET /artworks/market-day/compatible-garments`
  → 3 priced garments with placements; `POST /cart/items` (tote ×2) → `200` with server
  `unitPrice` 900,000 kobo and `lineTotal` 1,800,000; `GET /cart` subtotal 1,800,000;
  `POST /cart/promotion STUDIO10` → −180,000 (total 1,620,000); an unknown code →
  `422 PROMOTION_INVALID`.

- **Frontend action:** switch the affected domains to `DATA_SOURCE=api` and re-verify against real
  data. The seed admin account (`studio@taimanic.dev`) owns the content but has **no usable
  password** — it is a content owner, not a login. Customer registration via `/api/v1/auth/*`
  works against the seeded DB, so sign-in flows can be exercised for real.
