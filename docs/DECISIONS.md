# Architecture Decisions

## ADR-001 — Modular monolith

Status: Accepted. Start with one API and one worker, with domain boundaries inside the codebase. This avoids premature distributed-system cost while preserving extraction paths.

## ADR-002 — OpenAPI is the client contract

Status: Accepted. OpenAPI plus `packages/contracts` is the only supported backend-to-frontend boundary.

## ADR-003 — Artwork-first catalogue

Status: Accepted. Artwork and immutable artwork versions lead the catalogue. Garments are configurable canvases with administrator-approved compatibility and placements.

## ADR-004 — PostgreSQL, Prisma, Redis, BullMQ, S3-compatible storage

Status: Accepted for the backend foundation. Provider implementations remain replaceable behind interfaces.

## ADR-005 — Compatible stable TypeScript toolchain

Status: Accepted. Node 22.18, pnpm 10.20, NestJS 11.1, Prisma 7.8, Turbo 2.10, ESLint 10.7, Vitest 4.1, and TypeScript 6.0 are pinned. TypeScript 7.0 was not selected because typescript-eslint 8.64 supports TypeScript below 6.1.

## ADR-006 — Hashed identity artifacts and append-only audit history

Status: Accepted. Persist only hashes of sessions, verification tokens, reset tokens, and IP addresses. Enforce canonical email/permission values and identity lifecycle ordering with database checks, including required session revocation reasons and token consumption no later than expiry. Model permissions separately from roles and prevent audit-log updates/deletes at the database layer. User deletion is a soft-delete/anonymisation workflow so historical actor references remain intact. Verify these invariants against disposable PostgreSQL rather than mocks.

## ADR-007 — Opaque customer sessions and provider-neutral email

Status: Accepted. Hash passwords with parameterized scrypt and store only deployment-peppered HMAC digests for opaque session and one-time tokens. Deliver verification/recovery links through the shared email-provider boundary using SMTP locally and in compatible deployments. Authenticate browsers with an HttpOnly, SameSite=Lax cookie that is Secure in production. Keep throttling behind a dedicated service; the initial process-local implementation must move to Redis before horizontal scaling.

## ADR-008 — Separate admin sessions with TOTP assurance and database-backed RBAC

Status: Accepted. Administration sessions have a distinct cookie and persisted `ADMIN` audience so customer sessions cannot cross the trust boundary. Effective permissions are recalculated from non-expired database role assignments on every request. TOTP follows RFC 6238 with replayed time steps rejected; shared secrets are encrypted with deployment-specific AES-256-GCM key material and never returned after enrollment. Password and MFA challenges remain separate, short-lived, attempt-bounded records. Sensitive access mutations require both `system.manage` and MFA assurance, Owner elevation is Owner-only, and the final active Owner cannot be removed.

## ADR-009 — Insert-only artwork content with explicit lifecycle transitions

Status: Accepted. An `Artwork` is the stable catalogue root and `ArtworkVersion` is the exact creative/content snapshot. Content changes insert the next ordered draft; version identity, content, metadata, creator, and creation time are immutable in PostgreSQL, and versions cannot be deleted. Only lifecycle status/timestamps may transition. Publishing locks the root, archives the previous publication, and relies on a partial unique index to guarantee one published version. Exact-version asset relations arrive in the media slice without weakening this invariant.
