# Backend Handoff

## Current backend phase

B2 — Artwork and catalogue is active. TMS-B1-003 is Verified and merged. TMS-B2-001 is Verified on `codex/b2-artwork-versions` and awaits its focused PR and CI before TMS-B2-002 begins.

## Work completed

The B0 workspace, backend skeletons, shared packages, Prisma foundation, local infrastructure, CI, OpenAPI baseline, and project-control documents are merged. B1 identity, customer authentication, administrator authentication/TOTP/RBAC, and their migrations/contracts are Verified and merged.

TMS-B2-001 establishes `Artwork` as the stable creative root and `ArtworkVersion` as ordered immutable content. Creating or replacing content always inserts a draft version. PostgreSQL rejects version content changes and all deletion, validates lifecycle/timestamps, and allows only one published version per artwork. Version allocation and publication lock the artwork row; publishing archives the prior publication transactionally. Public list/detail return only published roots with the exact published version. Administrator list/detail/create/version/publish/archive operations enforce `catalogue.read` or `catalogue.write`, validate artwork/version pairs, and append actor/correlation-aware audit evidence.

## Tasks verified

TMS-B0-001 through TMS-B0-011, TMS-B1-001 through TMS-B1-003, and TMS-B2-001.

## Merge record

PR #1 was squash-merged at `2026-07-14T14:11:22Z` as `88a00912d8e5a0f5c05c07e9269add663f1c4fdf`. Main-branch GitHub Actions run 29339734452 passed.

PR #3 was squash-merged at `2026-07-16T00:37:27Z` as `5c6da304223b3aec7c3fdeb2a31178c90c4343ae` after GitHub Actions run 29461825758 passed.

PR #10 was squash-merged at `2026-07-16T01:44:51Z` as `88801c1374415eddf318a95e56ac3be7ab864c98` after GitHub Actions run 29464793865 passed.

PR #11 was squash-merged at `2026-07-16T02:59:00Z` as `30bd5c087baf0f9b281f5422d43e5c54e26ace94` after GitHub Actions run 29467786313 passed.

## Next task

Publish and merge the focused TMS-B2-001 PR, then start TMS-B2-002 — collections, drops, editions, stories, tags, and catalogue search — from the resulting latest `main`.

## API contracts added or changed

TMS-B2-001 adds public `GET /api/v1/artworks` and `GET /api/v1/artworks/:slug`, plus seven administrator artwork operations under `/api/v1/admin/artworks`. Shared contracts define artwork/version lifecycle, version input, creation input, public/admin records, and cursor pages. The administrator contract uses the existing separate admin cookie; reads require `catalogue.read` and writes require `catalogue.write`. There is intentionally no version update/delete endpoint.

`docs/contracts/openapi.yaml` remains the source of truth and `packages/contracts` is aligned and tested. Frontend response fields, lifecycle behavior, permission requirements, and the explicit TMS-B2-002/TMS-B2-004 delivery boundary are recorded in `docs/coordination/BACKEND_TO_FRONTEND.md`.

## Database migrations

Migration `20260714142500_identity_foundation` and `20260716015000_admin_authentication` are merged. Migration `20260716030500_artwork_versioning` is Verified locally. It adds artwork roots/versions, lifecycle enums, unique and lookup indexes, restrictive creator/parent foreign keys, lifecycle/content constraints, one-published-version partial uniqueness, an immutable-content update trigger, and a no-delete trigger. The integration suite applies all three migrations twice and runs the canonical seed twice.

## Environment variables added

TMS-B2-001 adds no environment variables.

## Files changed

TMS-B2-001 changes backend-owned API artwork/database code and tests, shared contracts, OpenAPI, backend documentation, coordination/state ledgers, and the minimal administrator-auth module export needed by the new service. It does not modify frontend-owned implementation, documentation, UI packages, or frontend state.

## Commands run

`pnpm check`, targeted/full API tests, database integration tests, contract tests, clean database/API builds, `pnpm db:validate`, `pnpm install --frozen-lockfile`, `docker compose -f infra/docker-compose.yml config --quiet`, `corepack pnpm@11.13.0 --pm-on-fail=ignore audit --audit-level high --prod`, static OpenAPI reference/operation validation, and a compiled API/runtime Swagger smoke. A concurrent single-attempt `docker info` race found by the first exact gate was fixed with bounded prerequisite retries in every PostgreSQL suite; the exact gate then passed.

## Test results

The exact full workspace gate passes formatting, linting, strict type checking, every automated test, production builds, and Prisma validation. The API has 41 passing tests across ten files, including six real HTTP/PostgreSQL artwork scenarios; the database package has five PostgreSQL migration/constraint/trigger tests. Static OpenAPI validation reports 31 paths, 33 unique operations, 155 valid references, and nine artwork operations. The compiled API boots, liveness returns `ok`, and runtime Swagger exposes 33 operations including all nine stable artwork operation IDs and the admin cookie scheme.

## Known defects and deferred scope

Readiness still reports process readiness only. Authentication throttling is process-local; replace it with Redis before horizontal scaling. The encrypted MFA format needs a multi-key rotation path before changing the production key. TMS-B2-001 intentionally does not invent the collection/tag/edition/search fields assigned to TMS-B2-002 or the media/preview/original/derivative fields assigned to TMS-B2-004.

## Blockers

No B2-001 blocker remains. Live Flutterwave and GIGL verification will remain credential-blocked in B5.

## Requests for Claude Code

Continue to own `apps/storefront`, `apps/admin`, `packages/ui`, frontend documentation, and `.ai/frontend-state.json`. Consume the B2-001 artwork contract only after its focused PR merges. Public list/detail are ready for the immutable core, but keep typed mocks for collection/filter/media fields until TMS-B2-002 and TMS-B2-004; do not synthesize them from generic version metadata.

## Do not redo

Do not recreate B0/B1 foundations, authentication, RBAC, artwork roots, immutable version rules, or their migrations/contracts.

## Exact continuation instruction

Publish `codex/b2-artwork-versions` as the focused TMS-B2-001 PR, resolve CI, and squash-merge it when clean and green. Then branch from the latest `main`, mark TMS-B2-002 In progress, and implement collections, drops, editions, stories, tags, and filterable/paginated public catalogue plus permissioned administrator APIs, migrations, OpenAPI/contracts, bypass/search tests, and current coordination/state evidence.
