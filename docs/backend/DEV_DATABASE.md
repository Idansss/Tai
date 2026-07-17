# Local development database

A single command migrates and seeds a runnable local database that mirrors the real storefront.
Integration tests still use disposable PostgreSQL containers (ADR-006); this is for running the
API and the storefront against real, browsable data.

## Prerequisites

The local infrastructure from `infra/docker-compose.yml` must be running. In this environment the
Postgres container `tai-postgres-1` is already up and publishes host port **5433** (not the default
5432), with role `tai` / password `local_development_only`.

## The command

From the repository root:

```bash
DATABASE_URL="postgresql://tai:local_development_only@localhost:5433/tai_dev?schema=public" \
  pnpm --filter @tms/database db:reset
```

`db:reset` (`prisma migrate reset --force --skip-generate`) drops the target database, applies every
migration in order, and runs the seed. Related scripts:

| Script                                   | Effect                                           |
| ---------------------------------------- | ------------------------------------------------ |
| `pnpm --filter @tms/database db:migrate` | Apply migrations only (`prisma migrate deploy`). |
| `pnpm --filter @tms/database db:seed`    | Run the seed only (idempotent; safe to re-run).  |
| `pnpm --filter @tms/database db:reset`   | Migrate from scratch **and** seed.               |

The dev seed lives in `prisma/seed-dev.ts` (RBAC + catalogue). It is deliberately separate from
`prisma/seed.ts`, which is the `prisma.config.ts` seed command the API integration tests invoke
(`prisma db seed`) and which stays **RBAC-only** so every test starts from an empty catalogue.

## Why `tai_dev` and not `tai_manic`

The container already contains a `tai_manic` database whose recorded Prisma migration history is a
stale, incompatible earlier iteration (`20260711_bootstrap` / `identity_rbac` / `auth_lockout`).
Running `prisma migrate deploy` against it fails on drift. The command above uses a clean `tai_dev`
database and leaves `tai_manic` untouched. To reclaim the old database later, drop it explicitly.

## Running the API against the seed

Point the API at the same connection string. All other configuration has development defaults
(`packages/configuration`), so only two overrides are typically needed:

```bash
DATABASE_URL="postgresql://tai:local_development_only@localhost:5433/tai_dev?schema=public" \
REDIS_URL="redis://localhost:6380" \
API_PORT=4010 \
  node apps/api/dist/main.js   # after `pnpm build`, or use `pnpm --filter @tms/api dev`
```

Health: `GET http://localhost:4010/api/v1/health/ready`. Swagger: `/api/docs`.

## What the seed contains

- The eight storefront artwork slugs, each PUBLISHED with one published version, tagged, and placed
  in collections / a live drop / a shoppable story / a limited edition.
- Garment templates `classic-tee` (₦14,000), `heavyweight-hoodie` (₦28,000), `canvas-tote`
  (₦9,000) with colours, sizes, variants, front/back placements, and scale presets. Money is
  integer kobo on the approved pair (ADR-015).
- Approved, priced artwork↔garment compatibilities with placement allowlists.
- Inventory on every variant, including one deliberately low-stock (`heavyweight-hoodie` / Ash / XL
  = 3) and one out-of-stock (`classic-tee` / White / XL = 0) variant.
- Promotion codes `STUDIO10` (10% off) and `WELCOME` (₦2,000 off, min subtotal ₦10,000).

The seed admin `studio@taimanic.dev` owns all seeded content but has no usable password — it is a
content owner, not a login. Customer registration via `/api/v1/auth/*` works against this database.
