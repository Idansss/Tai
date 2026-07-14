# Database

PostgreSQL is the system of record and Prisma is the schema/migration tool. The B0 schema intentionally contains no domain tables; B1 creates the first reviewed migration so the identity model is not accidentally treated as foundation boilerplate.

## Rules

- UUID identifiers, UTC timestamps, explicit foreign keys, useful indexes, and unique constraints
- Integer minor units plus ISO currency codes for money
- Immutable snapshots for paid-order history
- Transactions and concurrency control for inventory, checkout, payments, and state transitions
- Append-only movements/events where history matters
- Reversible migrations where practical; destructive migrations require staged rollout notes

Commands: `pnpm db:generate` and `pnpm db:validate`. Local PostgreSQL is defined in `infra/docker-compose.yml`.
