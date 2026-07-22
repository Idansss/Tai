# F.A.T.U / Tai Manic Studios

An art-first commerce platform for publishing original artwork across approved garment configurations, selling finished designs, and operating the workflow through a dedicated administration system.

> **Status:** Active collaborative development. The repository contains a storefront, admin application, modular API, background worker, shared packages, and infrastructure definitions.

![F.A.T.U storefront at desktop width](./apps/storefront/tests/__screenshots__/visual/showcase.spec.ts/home-desktop-1440.png)

## Product model

Artwork is the primary creative entity. Garments are approved canvases for immutable artwork versions—not the root catalogue entity.

The platform supports:

- editorial artwork and garment discovery;
- front/back garment configuration and artwork placement;
- saved designs and stable sharing;
- carts, promotions, checkout, payment-provider abstraction, and order snapshots;
- inventory reservations and append-only stock movement;
- customer identity and account workflows;
- administration, media ingestion, derivative processing, and operational review;
- a customer-facing concierge with configurable provider fallback.

## Workspace

```text
apps/api          Versioned NestJS API and OpenAPI document
apps/worker       BullMQ background-processing entry point
apps/storefront   Next.js customer storefront and Design Studio
apps/admin        Next.js administration application
packages/*        Contracts, database, UI, media, email, and shared tooling
infra             Local PostgreSQL, Redis, and object-storage infrastructure
docs              Product, testing, contract, coordination, and handoff records
```

OpenAPI is the backend-to-frontend source of truth. Shared contracts, frontend integrations, and backend handlers must stay aligned.

## Stack

| Layer     | Technology                                                      |
| --------- | --------------------------------------------------------------- |
| Workspace | pnpm, Turborepo, TypeScript                                     |
| Frontend  | Next.js 16, React 19, Tailwind CSS                              |
| API       | NestJS 11, OpenAPI, class-validator, Helmet                     |
| Data      | PostgreSQL, Prisma                                              |
| Jobs      | Redis, BullMQ                                                   |
| Media     | S3-compatible storage, Sharp                                    |
| Quality   | ESLint, Prettier, Vitest, Playwright, Testing Library, axe-core |

## Local setup

### Prerequisites

- Node.js 22.18 or newer
- pnpm 10.20 or newer
- Docker with Compose

### Install and run

```bash
cp .env.example .env
pnpm install
docker compose -f infra/docker-compose.yml up -d
pnpm db:generate
pnpm build
pnpm dev
```

Default local services:

- Storefront: `http://localhost:3000`
- Admin: `http://localhost:3001`
- API: `http://localhost:4000`
- OpenAPI: `http://localhost:4000/api/docs`
- Health: `http://localhost:4000/api/v1/health`

Use [`.env.example`](./.env.example) as the variable-name reference. Never commit real database, Redis, storage, email, payment, or AI-provider credentials.

## Commands

| Command             | Purpose                                  |
| ------------------- | ---------------------------------------- |
| `pnpm dev`          | Start workspace services in parallel     |
| `pnpm build`        | Build all packages and applications      |
| `pnpm format:check` | Verify formatting                        |
| `pnpm lint`         | Run workspace lint tasks                 |
| `pnpm typecheck`    | Run TypeScript checks                    |
| `pnpm test`         | Run unit and integration tests           |
| `pnpm db:validate`  | Validate the Prisma schema               |
| `pnpm check`        | Run the complete repository quality gate |

The storefront also exposes its Playwright suite through the package-specific scripts documented in [`apps/storefront/README.md`](./apps/storefront/README.md).

## Documentation map

- [`docs/backend/TESTING.md`](./docs/backend/TESTING.md) — backend verification
- [`docs/backend/SECURITY.md`](./docs/backend/SECURITY.md) — security model and expectations
- [`docs/frontend/README.md`](./docs/frontend/README.md) — frontend guidance
- [`docs/coordination/`](./docs/coordination/) — cross-boundary contract notes
- [`docs/handoffs/`](./docs/handoffs/) — implementation handoffs
- [`AGENTS.md`](./AGENTS.md) — repository ownership and completion rules

## Security and operations

- Keep price, availability, inventory, and order state server-authoritative.
- Validate media type, size, and ownership before ingestion; store derivatives under controlled keys.
- Protect admin routes with explicit role checks and audited mutations.
- Treat payment callbacks as untrusted until signature and idempotency checks pass.
- Do not log credentials, payment payloads, private customer data, or raw provider responses.
- Apply reviewed migrations and validate backup/restore behavior before production rollout.

## Contribution context and licence

This is a collaborative repository. Application areas have explicit ownership recorded in [`AGENTS.md`](./AGENTS.md); use commit and pull-request history when describing individual contributions.

No open-source licence is currently granted. Public visibility does not by itself permit reuse, modification, or redistribution.
