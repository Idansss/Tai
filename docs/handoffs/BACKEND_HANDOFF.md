# Backend Handoff

## Current backend phase

B2 — Artwork and catalogue is active. TMS-B2-001 is Verified and merged. TMS-B2-002 is Verified locally on `codex/b2-catalogue-content`; its focused PR, CI, and merge are pending. The next dependency-ready task after merge is TMS-B2-003.

## Work completed

The B0 foundation and all B1 identity/customer/admin authentication work are Verified and merged. TMS-B2-001 establishes `Artwork` as the stable creative root and ordered immutable `ArtworkVersion` snapshots with database-enforced immutability and exact publication.

TMS-B2-002 adds normalized typed tags, curated collections, timed drops, limited-edition declarations, and ordered-block editorial stories around artwork roots. Public collection/drop/story reads and canonical artwork search expose only published containers, published artwork roots, exact published versions, and published editions. Artwork search composes narrative text, collection, drop, tag, theme, mood, colour-family, and limited-edition filters with cursor pagination. Administrator CRUD and artwork associations require `catalogue.read` or `catalogue.write` and successful mutations append audit evidence.

## Tasks verified

TMS-B0-001 through TMS-B0-011, TMS-B1-001 through TMS-B1-003, and TMS-B2-001 through TMS-B2-002.

## Merge record

- PR #1: `88a00912d8e5a0f5c05c07e9269add663f1c4fdf`, main CI 29339734452.
- PR #3: `5c6da304223b3aec7c3fdeb2a31178c90c4343ae`, CI 29461825758.
- PR #10: `88801c1374415eddf318a95e56ac3be7ab864c98`, CI 29464793865.
- PR #11: `30bd5c087baf0f9b281f5422d43e5c54e26ace94`, CI 29467786313.
- PR #12: `daae9f37ea6119fdf8d4cc387fdd701d80a2de6c`, CI 29483761718.

## Next task

Commit and publish the focused TMS-B2-002 branch, open its PR, resolve CI, and squash-merge it when clean and green. Then branch from the latest `main`, record the TMS-B2-002 merge evidence, mark TMS-B2-003 In progress, and implement garment templates, colours, sizes, variants, size charts, placements, and approved artwork/garment compatibility.

## API contracts added or changed

`GET /api/v1/artworks` now accepts `q`, `collection`, `drop`, `tag`, `theme`, `mood`, `colourFamily`, `limitedEdition`, and `sort=newest` in addition to cursor pagination. Search records add typed `tags`, published `collections`, published `drops`, and published `editions` while preserving the exact `publishedVersion`.

New public cursor-list/detail routes are `/api/v1/collections`, `/api/v1/drops`, and `/api/v1/stories`. New administrator operations under `/api/v1/admin/catalogue` cover tags, collections, drops, editions, stories, and tag/collection/drop artwork associations. Reads require `catalogue.read`; mutations require `catalogue.write`. The static OpenAPI source and `packages/contracts` are aligned. The compiled runtime now uses the same stable operation IDs as all 65 static operations.

## Database migrations

Migrations `20260714142500_identity_foundation`, `20260716015000_admin_authentication`, and `20260716030500_artwork_versioning` are merged. Verified migration `20260716084000_catalogue_content` adds tags/artwork joins, collections/ordered members, drops/ordered members, editions, stories, and ordered story blocks. Checks enforce lifecycle timestamps, drop windows, edition quantity rules, optional single story ownership, object block content, and deterministic non-negative positions. The persistence suite deploys all four migrations and seeds twice.

## Environment variables added

TMS-B2-002 adds no environment variables.

## Files changed

The slice changes backend API/database code and tests, the shared contract package, OpenAPI, backend/contract documentation, coordination/TODO/handoff/state ledgers, and an API-only Vitest resource-bound configuration. It makes a minimal compatible operation-ID correction in backend auth/admin-auth/health decorators after compiled Swagger exposed pre-existing drift. It does not modify frontend-owned implementation, UI packages, frontend documentation, or frontend state.

## Commands run

`pnpm check`, targeted/full API tests, direct database integration tests, contract tests/build, API/database lint/type checks/builds, `pnpm install --frozen-lockfile`, `docker compose -f infra/docker-compose.yml config --quiet`, `corepack pnpm@11.13.0 --pm-on-fail=ignore audit --audit-level high --prod`, static OpenAPI YAML/reference/operation validation, and compiled runtime Swagger/static parity validation.

## Test results

The final exact `pnpm check` passes formatting, linting, strict type checking, every workspace test, all production builds, and Prisma validation. The API has 47 passing tests across 11 files; six catalogue HTTP/PostgreSQL scenarios cover RBAC, CRUD, filters, lifecycle/privacy, constraints, safe failures, and audits. The database package has six tests applying four migrations and directly checking catalogue constraints/indexes. Static OpenAPI reports 51 paths, 65 unique operations, and 376 resolved references. Compiled runtime Swagger reports the same 51 paths and 65 operation IDs with both session-cookie schemes.

Frozen install and Compose validation pass. The high-severity production audit exits successfully with one moderate advisory reported below the configured failure threshold.

## Known defects and deferred scope

Readiness still reports process readiness only. Authentication throttling remains process-local and must move to Redis before horizontal scaling. MFA encryption needs multi-key rotation before changing the production key. TMS-B2-003 owns garment configuration/compatibility; TMS-B2-004 owns exact-version media ingestion and derivatives. Drops/editions in this slice do not imply waitlists, preorder rules, purchase limits, or inventory.

## Blockers

No TMS-B2-002 blocker remains. Live Flutterwave and GIGL verification will remain credential-blocked in B5.

## Requests for Claude Code

Continue to own the frontend directories identified by `AGENTS.md`. Consume the TMS-B2-002 contract only after its focused PR merges. Catalogue discovery/editorial fields are ready; continue typed mocks for garment compatibility and media fields until TMS-B2-003/TMS-B2-004. Do not synthesize those missing domains from generic artwork metadata.

## Do not redo

Do not recreate B0/B1 foundations, authentication/RBAC, artwork roots/versioning, or TMS-B2-002 catalogue discovery/editorial models and contracts.

## Exact continuation instruction

Publish `codex/b2-catalogue-content`, resolve its focused PR/CI, and squash-merge it when green. Update merge evidence on the next branch, then start TMS-B2-003 from the resulting latest `main` without modifying frontend-owned files.
