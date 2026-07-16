# Database

PostgreSQL is the system of record and Prisma is the schema/migration tool. B1 introduces the first domain migration through TMS-B1-001.

## B1 identity foundation

Migration `20260714142500_identity_foundation` models users, customer/admin profiles, sessions, email-verification and password-reset tokens, roles, permissions, role grants, user assignments, and audit logs. Session and one-time-token values are stored only as hashes. Database checks enforce normalized emails and valid lifecycle timestamps; audit logs are append-only.

The seed is idempotent and establishes Owner, Store Administrator, Content Manager, Production Operator, Fulfilment Operator, Customer Support, and Analyst roles with explicit permissions. No administrator user or credential is seeded.

TMS-B1-002 uses the merged identity tables without a new migration. Passwords use salted scrypt encodings. Session, verification, reset, and IP values use deployment-peppered HMAC-SHA-256 digests; raw values exist only in the cookie or one-time email link. Verification and reset consumption, session creation/revocation, password changes, and their audit records execute transactionally.

Migration `20260716015000_admin_authentication` adds explicit customer/admin session audiences, password/MFA assurance levels, administrator display names, encrypted TOTP factor state, short-lived attempt-bounded MFA challenges, replay time-step tracking, and supporting indexes/check constraints. Existing sessions backfill to `CUSTOMER`/`PASSWORD`. MFA factor and challenge lifecycle rules are enforced in PostgreSQL. Administrator role assignments remain the canonical seeded RBAC model and may expire.

## B2 artwork versioning

Migration `20260716030500_artwork_versioning` adds artwork roots and ordered artwork versions with draft, published, and archived lifecycle states. Slugs and `(artwork_id, version_number)` are unique; a partial unique index allows at most one published version per artwork. Check constraints enforce slug, title, sequence, timestamp, and lifecycle validity. A database trigger rejects changes to version identity/content/metadata, while a separate trigger rejects all version deletion; lifecycle columns remain transitionable by the service. Artwork/version creator references are restrictive so operational history cannot be removed by deleting its actor.

Migration `20260716084000_catalogue_content` adds typed tags and normalized artwork-tag joins, curated collections and ordered membership, timed drops and ordered membership, artwork editions, editorial stories, and ordered story blocks. Database checks enforce slugs, lifecycle timestamps, valid drop windows, positive/required numbered-edition quantities, one optional story parent, object-shaped block content, and non-negative/unique block positions. Creator relationships remain restrictive; association and block rows cascade only with their owning catalogue record or artwork root.

Migration `20260716112000_garment_catalogue` adds garment templates, colours, measured sizes, colour/size SKU variants, normalized view placements, scale presets, exact artwork-version/template compatibility decisions, and compatibility placement allowlists. Checks enforce lifecycle ordering, slugs, positive measurements and physical print sizes, normalized geometry inside a 1000-by-1000 canvas, bounded scale percentages, and approval timestamps. Database triggers reject variants whose colour or size belongs to another template and reject compatibility placements from another template. Garment variants are the stable future inventory key, but this migration intentionally adds no stock quantities, movements, or reservations.

## Rules

- UUID identifiers, UTC timestamps, explicit foreign keys, useful indexes, and unique constraints
- Integer minor units plus ISO currency codes for money
- Immutable snapshots for paid-order history
- Transactions and concurrency control for inventory, checkout, payments, and state transitions
- Append-only movements/events where history matters
- Reversible migrations where practical; destructive migrations require staged rollout notes

Commands: `pnpm db:generate`, `pnpm db:validate`, `pnpm --filter @tms/database exec prisma migrate deploy`, and `pnpm --filter @tms/database exec prisma db seed`. Local PostgreSQL is defined in `infra/docker-compose.yml`.
