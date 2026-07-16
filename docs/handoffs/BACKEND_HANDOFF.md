# Backend Handoff

## Current backend phase

B1 — Identity and platform security is active. TMS-B1-001 is Verified and merged; TMS-B1-002 is Verified locally on `codex/b1-authentication` and ready for its focused pull request.

## Work completed

The B0 pnpm/Turborepo workspace, backend skeletons, shared packages, Prisma foundation, local infrastructure, CI, OpenAPI baseline, and project-control documents are merged.

The identity foundation defines users, customer/admin profiles, sessions, verification/reset tokens, roles, permissions, assignments, and immutable audit logs. Its repeatable PostgreSQL suite verifies migration, seed, lifecycle, index, RBAC, and append-only audit behavior.

Customer authentication now provides registration, login, logout, email verification, password reset, current-session lookup, one-session revocation with ownership enforcement, and revoke-all. Passwords use salted scrypt; opaque session and one-time tokens are stored only as deployment-peppered HMAC digests. Cookies are HttpOnly, SameSite=Lax, scoped to `/api/v1`, and Secure in production. Request endpoints use enumeration-safe responses, keyed throttling, SMTP-backed email templates, transactionally consumed tokens, session invalidation, and append-only audit evidence.

## Tasks verified

TMS-B0-001 through TMS-B0-011, TMS-B1-001, and TMS-B1-002.

## Merge record

PR #1 was squash-merged at `2026-07-14T14:11:22Z` as `88a00912d8e5a0f5c05c07e9269add663f1c4fdf`. Main-branch GitHub Actions run 29339734452 passed.

PR #3 was squash-merged at `2026-07-16T00:37:27Z` as `5c6da304223b3aec7c3fdeb2a31178c90c4343ae` after GitHub Actions run 29461825758 passed. The merge retained current frontend work from `main`, regenerated the shared lockfile, updated the CI audit client for npm's retired legacy endpoints, and removed a millisecond-sensitive health-test race.

TMS-B1-002 is not merged yet. Its focused pull request must be opened from `codex/b1-authentication`, kept green, and squash-merged before TMS-B1-003 starts.

## Next task

TMS-B1-003 — implement admin authentication, MFA-ready architecture, granular RBAC, and object-level authorization after the TMS-B1-002 pull request merges.

## API contracts added or changed

The additive `/api/v1/auth` contract now covers register, login, logout, verification request/confirm, reset request/confirm, current session, one-session revocation, and revoke-all. The contract defines auth input/output schemas, the `tms_session` cookie security scheme, and explicit authentication/session/token/rate-limit error codes. `docs/contracts/openapi.yaml` remains the source of truth and `packages/contracts` is aligned and tested against it.

Frontend consumption details, cookie behavior, response fields, errors, and required verification/reset routes are recorded in `docs/coordination/BACKEND_TO_FRONTEND.md`.

## Database migrations

Migration `20260714142500_identity_foundation` is Verified and merged on `main`. TMS-B1-002 reuses those reviewed identity/session/token/audit tables and requires no new migration.

## Environment variables added

Authentication adds `APP_PUBLIC_URL`, `SMTP_URL`, `EMAIL_FROM`, `AUTH_TOKEN_PEPPER`, `AUTH_SESSION_COOKIE_NAME`, `AUTH_SESSION_TTL_SECONDS`, `AUTH_VERIFICATION_TTL_SECONDS`, `AUTH_PASSWORD_RESET_TTL_SECONDS`, `AUTH_RATE_LIMIT_WINDOW_SECONDS`, and `AUTH_RATE_LIMIT_MAX_ATTEMPTS`. Production configuration rejects the documented local-only token pepper.

## Files changed

TMS-B1-002 changes backend-owned API auth/database/platform code, contracts, configuration, email, database exports, OpenAPI, backend documentation, coordination/state ledgers, `.env.example`, and the shared lockfile. It does not modify frontend-owned implementation, documentation, or state.

## Commands run

`pnpm install --frozen-lockfile`, `pnpm check`, `pnpm --filter @tms/api test`, `pnpm --filter @tms/database build`, `pnpm --filter @tms/api build`, `pnpm db:validate`, `docker compose -f infra/docker-compose.yml config --quiet`, `corepack pnpm@11.13.0 --pm-on-fail=ignore audit --audit-level high --prod`, static OpenAPI reference/operation/schema validation, and a compiled API/runtime Swagger smoke.

## Test results

The full workspace gate passes formatting, linting, strict type checking, all automated tests, production builds, and Prisma validation. The API has 20 passing tests, including seven real HTTP/PostgreSQL authentication scenarios; the identity package retains four PostgreSQL integration tests. Frozen install, Compose validation, and the high-severity production dependency audit pass. The audit reports one moderate advisory only. The compiled API boots and runtime Swagger exposes the new auth paths and cookie scheme.

## Known defects

Readiness still reports process readiness only. Authentication throttling is process-local for the current single-instance phase; replace it with Redis before horizontal scaling. Email verification and reset links intentionally target frontend routes documented for Claude Code to implement.

## Blockers

No B1 blocker remains. Live Flutterwave and GIGL verification will remain credential-blocked in B5.

## Requests for Claude Code

Start from the latest `main`. Continue to own `apps/storefront`, `apps/admin`, `packages/ui`, frontend documentation, and `.ai/frontend-state.json`. After the TMS-B1-002 contract merges, consume the auth endpoints and implement `/account/verify-email` and `/account/reset-password` using the details in `docs/coordination/BACKEND_TO_FRONTEND.md`.

## Do not redo

Do not recreate the workspace foundation, backend skeletons, identity migration, authentication primitives, initial contracts, infrastructure, or project-control files.

## Exact continuation instruction

Open the focused TMS-B1-002 pull request from `codex/b1-authentication`, resolve CI, and squash-merge it. Then branch from the latest `main`, mark TMS-B1-003 In progress, and implement admin authentication/RBAC/object authorization with migrations, OpenAPI/contracts, positive and bypass tests, and current coordination/state evidence.
