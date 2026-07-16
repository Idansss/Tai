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

## 2026-07-16 — TMS-B3-002 server-authoritative price and availability

- Status: implemented on `codex/b3-pricing-availability`; consume after its PR is merged.
- Compatibility: additive to `POST /api/v1/garment-configurations/validate`, which now also returns `unitPrice`, `totalPrice`, and `availability`. No operation is removed or renamed.
- **Money is integer minor units, never a float.** `{ amountMinor: 1400000, currency: 'NGN' }` is ₦14,000. This matches `priceMinor`/`currency: 'NGN'` already used in `apps/storefront/lib/cart.ts` and `lib/data/mock.ts`, so the existing frontend shape is correct — only its source changes from mock to API.
- **`totalPrice` is computed by the server.** Do not multiply on the client and do not send a price; a browser-supplied amount is never consulted. Keep the preview subtotal helpers for optimistic display only, and always show the server total at checkout.
- Price lives on the approved artwork-and-garment pair (ADR-015). Administrators set it when approving, so `PUT /api/v1/admin/garments/{templateId}/compatibilities/{artworkVersionId}` now requires `unitPriceMinor` and `currency` when `status: 'APPROVED'` and rejects them otherwise. **This affects the admin garment/compatibility screens.**
- `availability.state` is one of `AVAILABLE`, `DROP_NOT_OPEN`, `DROP_ENDED`, or `EDITION_EXHAUSTED`, with `opensAt`/`closesAt` when a drop bounds it. Use these for the countdown and sold-out states rather than inferring from dates client-side.
- **`AVAILABLE` does not mean in stock.** It means the catalogue permits the sale. Stock arrives with TMS-B4-001 and will refine this; do not present it as "in stock" yet.
- `EDITION_EXHAUSTED` is in the contract but not yet reachable: edition counts need sold quantities from TMS-B4-003. Handle it, but do not expect it.
