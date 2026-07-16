# Backend Handoff

## Current backend phase

B2 — Artwork and catalogue is active. TMS-B2-001 through TMS-B2-003 are Verified and merged. TMS-B2-004 is In progress on `codex/b2-media-pipeline`.

## Work completed

TMS-B2-003 adds approved blank-garment canvases without weakening the artwork-first catalogue. Garment templates own colours, measured sizes, colour/size SKU variants, normalized view placements, and scale presets. Compatibility approval binds an exact immutable published artwork version to one published garment template and an explicit placement allowlist. A replacement artwork version never inherits an older version's approval.

Published garment structure is locked until the template leaves publication. Leaving publication archives approved compatibility decisions so structural edits and republication require fresh approval. Public configuration validation accepts only an exact published artwork version, published template/variant/colour/size, published placement/view/scale, and approved exact-version compatibility. Inventory quantities remain variant-based deferred scope.

## Tasks verified

TMS-B0-001 through TMS-B0-011, TMS-B1-001 through TMS-B1-003, and TMS-B2-001 through TMS-B2-003.

## Merge record

- PR #1: `88a00912d8e5a0f5c05c07e9269add663f1c4fdf`, main CI 29339734452.
- PR #3: `5c6da304223b3aec7c3fdeb2a31178c90c4343ae`, CI 29461825758.
- PR #10: `88801c1374415eddf318a95e56ac3be7ab864c98`, CI 29464793865.
- PR #11: `30bd5c087baf0f9b281f5422d43e5c54e26ace94`, CI 29467786313.
- PR #12: `daae9f37ea6119fdf8d4cc387fdd701d80a2de6c`, CI 29483761718.
- PR #13: `ce8bca4f7e7866cee698a77c9a94319418e8ca8a`, CI 29489686858.
- PR #14: `4e8b76bbd6266ccb2c7959e38f2c78112f7e0f79`, CI 29497566759.

## Next task

Implement TMS-B2-004 exact-version media ingestion, validation/scanning, immutable originals, web/thumbnail derivative jobs, mockups, and approval workflow.

## API contracts added or changed

Four public operations add published garment list/detail, exact published-artwork-version compatible garments, and exact configuration validation. Twenty-two administrator operations under `/api/v1/admin/garments` manage templates, colours, sizes/measurements, variants, placements, scale presets, and exact artwork-version compatibility. Administrator reads require `catalogue.read`; mutations require `catalogue.write`.

The shared contract adds garment types/views/lifecycle entities and inputs plus `CONFIGURATION_NOT_APPROVED`. Static OpenAPI and compiled runtime Swagger match at 68 paths and 91 stable operation IDs with both session-cookie schemes.

## Database migration

`20260716112000_garment_catalogue` adds nine garment and compatibility tables, enum types, foreign keys, indexes, checks, and membership triggers. Geometry is normalized to a 1000-by-1000 integer canvas while physical print dimensions remain positive millimetres. Compatibility references `ArtworkVersion`, not the mutable `Artwork` root. The persistence suite deploys all five migrations and seeds twice.

## Environment variables added

None.

## Files changed

Only backend-owned API/database code and tests, shared contracts/OpenAPI, backend/contract/coordination documentation, TODO/handoff/state ledgers, and the existing backend seed's bounded transaction configuration. No frontend-owned implementation, frontend documentation, UI package, or frontend state file was modified.

## Commands and results

The exact `pnpm check` passes formatting, all workspace lint/type/test suites, all production builds, and Prisma validation. The API has 53 passing tests across 12 files; the database package has seven passing tests. `pnpm install --frozen-lockfile`, Compose validation, high-severity production audit, static OpenAPI YAML/reference/operation validation, and compiled Swagger/static parity pass. The audit reports one moderate advisory below the configured failure threshold.

## Known defects and deferred scope

Readiness still reports process readiness only. Authentication throttling remains process-local and must move to Redis before horizontal scaling. MFA encryption needs multi-key rotation before changing the production key. TMS-B2-004 owns exact-version media originals, derivatives, previews, mockups, and approval. TMS-B4-001 owns garment inventory quantities, movements, alerts, and reservations.

## Blockers

No B2 blocker is currently known. Live Flutterwave and GIGL verification remains credential-blocked later in B5.

## Requests for Claude Code

Continue to own the frontend directories identified by `AGENTS.md`. Consume the TMS-B2-003 contract only after its focused PR merges. Use the exact-version compatibility endpoints and treat `422 CONFIGURATION_NOT_APPROVED` as an unavailable selection requiring refresh. Do not infer compatibility, price, stock, or media URLs client-side.

## Do not redo

Do not recreate B0/B1 foundations, authentication/RBAC, artwork roots/versioning, catalogue discovery/editorial content, or the garment schema and exact-version compatibility work in this slice.

## Exact continuation instruction

Continue TMS-B2-004 on `codex/b2-media-pipeline`, validate, document, publish, resolve CI, and merge its focused PR without modifying frontend-owned files.
