# Backend Traceability Matrix

| Requirement                          | Task IDs       | Evidence                                                          | Verification                                                         |
| ------------------------------------ | -------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| Shared monorepo foundation           | TMS-B0-001–004 | Root workspace/configs and frontend placeholders                  | `pnpm install`, workspace build                                      |
| Versioned safe API baseline          | TMS-B0-005     | `apps/api`, OpenAPI, contracts                                    | API unit test, lint, typecheck, build                                |
| Background jobs foundation           | TMS-B0-006     | `apps/worker`, BullMQ dependency                                  | Worker config tests and build                                        |
| Shared typed contracts               | TMS-B0-007     | `packages/contracts` and API contract docs                        | Contract tests and build                                             |
| PostgreSQL/Prisma/local services     | TMS-B0-008     | `packages/database`, Docker Compose                               | Prisma and Compose validation                                        |
| CI and quality gates                 | TMS-B0-009     | GitHub Actions workflow                                           | Local equivalent `pnpm check`                                        |
| Persistent coordination              | TMS-B0-010     | `AGENTS.md`, `docs`, `.ai`                                        | Required-file inspection                                             |
| Foundation landing and handoff       | TMS-B0-011     | PR #1, merge `88a00912`, main CI run 29339734452                  | Merge-state, file-presence, CI, runtime checks                       |
| Identity persistence/RBAC/audit      | TMS-B1-001     | Identity migration, seed, integration suite                       | PostgreSQL migration/seed/invariant tests                            |
| Customer authentication              | TMS-B1-002     | Auth module, SMTP email, cookie sessions, OpenAPI                 | PostgreSQL HTTP, hashing, recovery, ownership, throttle tests        |
| Admin identity and authorization     | TMS-B1-003     | Admin auth/MFA module, audience migration, RBAC guards, OpenAPI   | PostgreSQL HTTP, RFC TOTP, permission, object-bypass, contract tests |
| Artwork roots and immutable versions | TMS-B2-001     | Artwork module, versioning migration, RBAC, OpenAPI               | PostgreSQL triggers/indexes, HTTP lifecycle/bypass/contract tests    |
| Catalogue discovery and editorial    | TMS-B2-002     | Catalogue module, normalized migration, RBAC, OpenAPI             | PostgreSQL constraints, HTTP CRUD/filter/privacy/contract tests      |
| Garment canvases and compatibility   | TMS-B2-003     | Garment module, normalized migration, RBAC, OpenAPI               | PostgreSQL constraints, HTTP lifecycle/approval/configuration tests  |
| Media ingestion and derivatives      | TMS-B2-004     | Future media modules, storage adapter, and worker jobs            | File validation, malware hook, worker/API tests                      |
| Design configurations/rendering      | TMS-B3-001–003 | Future B3 schema/services/jobs                                    | Contract, availability, renderer tests                               |
| Inventory/cart/checkout/orders       | TMS-B4-001–004 | `apps/api/src/inventory` and ledger migration; B4-002–004 pending | Final-unit race, expiry, append-only, permission tests; rest pending |
| Flutterwave/GIGL-ready integrations  | TMS-B5-001–003 | Future provider interfaces/adapters                               | Webhook, duplicate, timeout, contract tests                          |
| Production/admin operations          | TMS-B6-001–002 | Future operations/admin APIs                                      | Permission, transition, export tests                                 |
| Growth/AI/analytics                  | TMS-B7-001–003 | Future modules/provider-neutral AI                                | Approval, grounding, failure, analytics tests                        |
| Hardening/deployment                 | TMS-B8-001–003 | Future reports, IaC, runbooks                                     | Load, restore, canary, documentation audit                           |
