# Tai Manic Studios

Art-first commerce platform for publishing original artwork across approved garment configurations.

## Workspace

This repository is a pnpm/Turborepo monorepo. The backend is a modular TypeScript system with a NestJS API, a background worker, PostgreSQL/Prisma persistence, Redis/BullMQ jobs, and S3-compatible storage.

```text
apps/api          Versioned HTTP API and OpenAPI document
apps/worker       Background processing entry point
apps/storefront   Frontend-owned storefront location
apps/admin        Frontend-owned administration location
packages/*        Shared contracts and platform packages
infra             Local infrastructure
docs              Product, backend, contract, and coordination records
```

## Prerequisites

- Node.js 22.18 or newer
- pnpm 10.20 or newer
- Docker with Compose for local services

## Quick start

```bash
cp .env.example .env
pnpm install
docker compose -f infra/docker-compose.yml up -d
pnpm db:generate
pnpm build
pnpm dev
```

The API listens on `http://localhost:4000`, with OpenAPI UI at `/api/docs` and liveness/readiness under `/api/v1/health`.

## Quality checks

Run `pnpm check` before opening a pull request. See `docs/backend/TESTING.md` and `AGENTS.md` for ownership and coordination rules.
