# Database

PostgreSQL is the system of record and Prisma is the schema/migration tool. B1 introduces the first domain migration through TMS-B1-001.

## B1 identity foundation

Migration `20260714142500_identity_foundation` models users, customer/admin profiles, sessions, email-verification and password-reset tokens, roles, permissions, role grants, user assignments, and audit logs. Session and one-time-token values are stored only as hashes. Database checks enforce normalized emails and valid lifecycle timestamps; audit logs are append-only.

The seed is idempotent and establishes Owner, Store Administrator, Content Manager, Production Operator, Fulfilment Operator, Customer Support, and Analyst roles with explicit permissions. No administrator user or credential is seeded.

TMS-B1-002 uses the merged identity tables without a new migration. Passwords use salted scrypt encodings. Session, verification, reset, and IP values use deployment-peppered HMAC-SHA-256 digests; raw values exist only in the cookie or one-time email link. Verification and reset consumption, session creation/revocation, password changes, and their audit records execute transactionally.

Migration `20260716015000_admin_authentication` adds explicit customer/admin session audiences, password/MFA assurance levels, administrator display names, encrypted TOTP factor state, short-lived attempt-bounded MFA challenges, replay time-step tracking, and supporting indexes/check constraints. Existing sessions backfill to `CUSTOMER`/`PASSWORD`. MFA factor and challenge lifecycle rules are enforced in PostgreSQL. Administrator role assignments remain the canonical seeded RBAC model and may expire.

## Rules

- UUID identifiers, UTC timestamps, explicit foreign keys, useful indexes, and unique constraints
- Integer minor units plus ISO currency codes for money
- Immutable snapshots for paid-order history
- Transactions and concurrency control for inventory, checkout, payments, and state transitions
- Append-only movements/events where history matters
- Reversible migrations where practical; destructive migrations require staged rollout notes

Commands: `pnpm db:generate`, `pnpm db:validate`, `pnpm --filter @tms/database exec prisma migrate deploy`, and `pnpm --filter @tms/database exec prisma db seed`. Local PostgreSQL is defined in `infra/docker-compose.yml`.
