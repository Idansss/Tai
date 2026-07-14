# Changelog

All notable changes to Tai Manic Studios are documented here.

The project uses a four-part release version: `major.minor.patch.micro`.

## [0.1.0.0] - 2026-07-14

### Added

- Established the shared pnpm/Turborepo repository so backend and frontend agents can work in clearly owned areas.
- Added a versioned NestJS API with safe errors, correlation IDs, structured redacted logs, OpenAPI documentation, and health endpoints.
- Added the background worker, shared typed contracts, validation/configuration packages, and Prisma database foundation.
- Added local PostgreSQL, Redis, S3-compatible storage, and email-capture services through Docker Compose.
- Added CI quality gates and persistent product, architecture, contract, security, testing, deployment, coordination, traceability, progress, and handoff records.

### Changed

- Squash-merged the verified B0 foundation through PR #1 as `88a00912`; its exact `main` commit passed GitHub Actions.
- Added `/api/v1/health/live` and `/api/v1/health/ready` as backward-compatible aliases for the existing health endpoints used by frontend startup guidance.
