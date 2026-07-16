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
