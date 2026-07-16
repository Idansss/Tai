# Backend Handoff

## Current backend phase

B1 — Identity and platform security is complete locally. TMS-B1-001 and TMS-B1-002 are Verified and merged; TMS-B1-003 is Verified on `codex/b1-admin-auth` and awaits its focused PR and CI before B2 begins.

## Work completed

The B0 pnpm/Turborepo workspace, backend skeletons, shared packages, Prisma foundation, local infrastructure, CI, OpenAPI baseline, and project-control documents are merged.

The identity foundation defines users, customer/admin profiles, sessions, verification/reset tokens, roles, permissions, assignments, and immutable audit logs. Its repeatable PostgreSQL suite verifies migration, seed, lifecycle, index, RBAC, and append-only audit behavior.

Customer authentication provides registration, login, logout, email verification, password reset, current-session lookup, one-session revocation with ownership enforcement, and revoke-all. Passwords use salted scrypt; opaque session and one-time tokens are stored only as deployment-peppered HMAC digests. Cookies are HttpOnly, SameSite=Lax, scoped to `/api/v1`, and Secure in production. Recovery endpoints use enumeration-safe responses, keyed throttling, SMTP-backed email templates, transactionally consumed tokens, session invalidation, and append-only audit evidence.

Administrator authentication uses a separate persisted session audience and `tms_admin_session` cookie. Password login creates password-only assurance; TOTP verification elevates a session to MFA assurance. Enrollment factors are stored with AES-256-GCM authenticated encryption, challenges are short-lived/one-time/attempt-bounded, accepted timesteps cannot be replayed, and production rejects the documented local encryption key. Roles and permissions are reloaded from PostgreSQL for every protected request. Role changes and cross-admin session revocation require `system.manage` plus MFA; Owner elevation is Owner-only and the final active Owner cannot be removed. Provisioning and audited lost-device MFA reset commands provide explicit operator recovery paths.

## Tasks verified

TMS-B0-001 through TMS-B0-011 and TMS-B1-001 through TMS-B1-003.

## Merge record

PR #1 was squash-merged at `2026-07-14T14:11:22Z` as `88a00912d8e5a0f5c05c07e9269add663f1c4fdf`. Main-branch GitHub Actions run 29339734452 passed.

PR #3 was squash-merged at `2026-07-16T00:37:27Z` as `5c6da304223b3aec7c3fdeb2a31178c90c4343ae` after GitHub Actions run 29461825758 passed. The merge retained current frontend work from `main`, regenerated the shared lockfile, updated the CI audit client for npm's retired legacy endpoints, and removed a millisecond-sensitive health-test race.

PR #10 was squash-merged at `2026-07-16T01:44:51Z` as `88801c1374415eddf318a95e56ac3be7ab864c98` after GitHub Actions run 29464793865 passed.

## Next task

Publish and merge the focused TMS-B1-003 PR, then start TMS-B2-001 — Artwork and immutable ArtworkVersion persistence and APIs — from the resulting latest `main`.

## API contracts added or changed

The additive `/api/v1/admin` contract covers administrator login/logout/session lookup, TOTP enrollment/confirmation/verification, owned or authorized session revocation, role listing, role assignment, and role revocation. It defines the separate admin cookie security scheme, challenge and assurance fields, role summaries, and explicit MFA errors. `docs/contracts/openapi.yaml` remains the source of truth and `packages/contracts` is aligned and tested against it.

Customer sessions are now explicitly stored with the `CUSTOMER` audience, and all customer guards and revocation paths restrict that audience. These are security semantics rather than a breaking public customer contract change.

Frontend consumption details, cookie behavior, request/response fields, errors, MFA enrollment flow, and permission behavior are recorded in `docs/coordination/BACKEND_TO_FRONTEND.md`.

## Database migrations

Migration `20260714142500_identity_foundation` is Verified and merged on `main`. TMS-B1-002 reuses those reviewed tables and requires no migration. Migration `20260716015000_admin_authentication` is Verified locally: it adds session audience/assurance, encrypted administrator MFA factors, bounded authentication challenges, indexes, safe backfills, and lifecycle constraints. The PostgreSQL integration suite applies and validates both migrations repeatedly.

## Environment variables added

Customer authentication variables remain documented. TMS-B1-003 adds `ADMIN_AUTH_COOKIE_NAME`, `ADMIN_AUTH_SESSION_TTL_SECONDS`, `ADMIN_MFA_CHALLENGE_TTL_SECONDS`, and `ADMIN_MFA_ENCRYPTION_KEY`. Production configuration rejects the documented local-only encryption key.

## Files changed

TMS-B1-003 changes backend-owned API administrator-auth/database/platform code, shared contracts and configuration, Prisma schema/migration/exports/tests, OpenAPI, backend documentation, coordination/state ledgers, and `.env.example`. It does not modify frontend-owned implementation, documentation, or state.

## Commands run

`pnpm install --frozen-lockfile`, `pnpm check`, targeted and full API tests, database migration tests, clean database/API builds, `pnpm db:validate`, `docker compose -f infra/docker-compose.yml config --quiet`, `corepack pnpm@11.13.0 --pm-on-fail=ignore audit --audit-level high --prod`, static OpenAPI reference/operation validation, and a compiled API/runtime Swagger smoke.

## Test results

The exact full workspace gate passes formatting, linting, strict type checking, all automated tests, production builds, and Prisma validation. The API has 35 passing tests across nine files, including seven real HTTP/PostgreSQL customer-authentication scenarios and seven administrator-authentication scenarios; the database package has four PostgreSQL migration/constraint tests. Frozen install, Compose validation, and the high-severity production dependency audit pass; the audit reports one moderate advisory only. Static OpenAPI validation reports 23 paths, 24 operations, 92 valid references, and ten administrator operations. The compiled API boots and runtime Swagger exposes both customer/admin cookie schemes and the new administrator paths.

## Known defects

Readiness still reports process readiness only. Authentication throttling is process-local for the current single-instance phase; replace it with Redis before horizontal scaling. Email verification and reset links intentionally target frontend routes documented for Claude Code to implement. The encrypted MFA format is versioned, but changing the production encryption key requires a future multi-key rotation path before the old key is retired.

## Blockers

No B1 blocker remains. Live Flutterwave and GIGL verification will remain credential-blocked in B5.

## Requests for Claude Code

Start from the latest `main`. Continue to own `apps/storefront`, `apps/admin`, `packages/ui`, frontend documentation, and `.ai/frontend-state.json`. Consume the administrator auth and RBAC contract only after its focused PR merges; the exact flow and errors are in `docs/coordination/BACKEND_TO_FRONTEND.md`.

## Do not redo

Do not recreate the workspace foundation, backend skeletons, identity migrations, customer/admin authentication primitives, initial contracts, infrastructure, or project-control files.

## Exact continuation instruction

Publish `codex/b1-admin-auth` as the focused TMS-B1-003 PR, resolve CI, and squash-merge it when clean and green. Then branch from the latest `main`, mark TMS-B2-001 In progress, and implement Artwork plus immutable ArtworkVersion persistence and APIs with migration constraints, authorization, OpenAPI/contracts, positive/bypass/lifecycle tests, and current coordination/state evidence.
