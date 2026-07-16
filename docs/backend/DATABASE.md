# Database

PostgreSQL is the system of record and Prisma is the schema/migration tool. B1 introduces the first domain migration through TMS-B1-001.

## B1 identity foundation

Migration `20260714142500_identity_foundation` models users, customer/admin profiles, sessions, email-verification and password-reset tokens, roles, permissions, role grants, user assignments, and audit logs. Session and one-time-token values are stored only as hashes. Database checks enforce normalized emails and valid lifecycle timestamps; audit logs are append-only.

The seed is idempotent and establishes Owner, Store Administrator, Content Manager, Production Operator, Fulfilment Operator, Customer Support, and Analyst roles with explicit permissions. No administrator user or credential is seeded.

## Rules

- UUID identifiers, UTC timestamps, explicit foreign keys, useful indexes, and unique constraints
- Integer minor units plus ISO currency codes for money
- Immutable snapshots for paid-order history
- Transactions and concurrency control for inventory, checkout, payments, and state transitions
- Append-only movements/events where history matters
- Reversible migrations where practical; destructive migrations require staged rollout notes

Commands: `pnpm db:generate`, `pnpm db:validate`, `pnpm --filter @tms/database exec prisma migrate deploy`, and `pnpm --filter @tms/database exec prisma db seed`. Local PostgreSQL is defined in `infra/docker-compose.yml`.
