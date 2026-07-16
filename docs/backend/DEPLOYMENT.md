# Backend Deployment

B0 supplies local infrastructure and CI only. Production deployment is intentionally unverified until B8 chooses an environment and provisions managed PostgreSQL, Redis, object storage, secret management, monitoring, backups, and network controls.

Deployments must run immutable builds, migration validation, health checks, readiness gates, backward-compatible migrations, and rollback procedures. Provider credentials remain environment-managed. Live Flutterwave and GIG Logistics verification stays Blocked until credentials and certification access exist.

Customer authentication additionally requires a deployment-specific `AUTH_TOKEN_PEPPER`, public application URL, SMTP URL/from address, and reviewed session/verification/reset TTLs. The process-local authentication limiter is suitable for one API replica only; move it to Redis before horizontal scaling.

Administrator authentication additionally requires a deployment-specific 32-byte base64url `ADMIN_MFA_ENCRYPTION_KEY`, a reviewed admin cookie name/session TTL, and an MFA challenge TTL. Provision the first or additional staff account only from a trusted operator environment with `ADMIN_PROVISION_EMAIL`, `ADMIN_PROVISION_PASSWORD`, `ADMIN_PROVISION_NAME`, optional `ADMIN_PROVISION_ROLE`, and optional `ADMIN_PROVISION_MFA_REQUIRED`; run `pnpm --filter @tms/api admin:provision`, then remove the password variable from the environment. The RBAC seed must run before provisioning. Production administrators should keep MFA required. For a lost authenticator, set `ADMIN_MFA_RESET_EMAIL` in a trusted operator environment and run `pnpm --filter @tms/api admin:mfa-reset`; the command is audited, revokes every admin session/challenge, and forces enrollment on the next login.

## Supabase hosting (TMS-B8-004)

The shared development and staging database and object storage are hosted on the Supabase project `tmijjorpsvawxlpvpuil` (`eu-west-1`, PostgreSQL 17.6). Nothing in this section is required for tests: every suite provisions its own disposable `postgres:17-alpine` container and must keep doing so, because tests must never depend on shared mutable infrastructure.

### The project is shared, not dedicated

This project previously hosted two other applications and their schemas remain in `public`: Maxx Engage AI (`user_profiles`, `user_memory`, `uploaded_files`, `document_chunks`, `conversation_logs`) and ProofOS (`users`, `skill_paths`, `tasks`, `submissions`, `reviews`, `credentials`, `vouches`, `stamps`, and others). Some hold seed data — `skill_paths` 12 rows, `tasks` 11 rows, `project_briefs` 4 rows — and `auth.users` holds 3 accounts. A public `avatars` bucket holds one object. None of it belongs to Tai and none of it has been deleted.

`public.users` collides directly with Tai's identity foundation, and `public.reviews`, `public.notifications`, and `public.tasks` collide with planned TMS-B7-001, TMS-B4-004, and TMS-B6-001 tables.

### Tai therefore owns the `tai` schema, not `public`

`CREATE SCHEMA tai` isolates every Tai table. This avoids all four collisions without deleting anyone's data, is reversible with `DROP SCHEMA tai CASCADE`, and — because `tai` is not in Supabase's exposed schemas — the tables are unreachable through PostgREST and the anon key. The API reaches them over a direct PostgreSQL connection instead. Confirm `tai` is absent from Settings → API → Exposed schemas before any production use.

### Connect in session mode, never transaction mode

The API opens **interactive** transactions in roughly 30 places across authentication, artwork, catalogue, garment, media, and the RBAC seed. Supabase's Supavisor pooler in transaction mode (port `6543`) does not support interactive transactions or prepared statements and will fail in ways that look like intermittent runtime faults rather than a clear configuration error.

Use the direct connection or Supavisor **session** mode on port `5432`, and append the schema:

```
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/postgres?schema=tai
```

Never commit a real `DATABASE_URL`. It belongs in the environment or a secret manager only.

### Apply the schema

Prisma owns the migration history, so apply migrations with Prisma rather than the Supabase SQL editor or MCP; otherwise `_prisma_migrations` drifts and later deploys fail:

```bash
DATABASE_URL='postgresql://...:5432/postgres?schema=tai' pnpm --filter @tms/database exec prisma migrate deploy
DATABASE_URL='postgresql://...:5432/postgres?schema=tai' pnpm --filter @tms/database exec prisma db seed
```

The seed is idempotent and installs the canonical 7 roles, 12 permissions, and 34 grants. Provision the first administrator afterwards with `pnpm --filter @tms/api admin:provision`.

### Object storage

Bucket `tai-manic-media` is created **private** — immutable originals must never be publicly readable, and the API issues short-lived signed URLs instead. The bucket enforces a 25 MB limit and accepts only `image/png`, `image/jpeg`, and `image/webp`, mirroring `packages/media` validation so the limits hold even if the application layer is bypassed. Do not make this bucket public and do not reuse the unrelated public `avatars` bucket.

Supabase Storage speaks the S3 protocol, so `S3ObjectStorage` needs no code change — only configuration. Create an S3 access key under Storage → S3 Access Keys and set:

```
S3_ENDPOINT=https://tmijjorpsvawxlpvpuil.storage.supabase.co/storage/v1/s3
S3_REGION=eu-west-1
S3_BUCKET=tai-manic-media
S3_ACCESS_KEY=<from Supabase Storage S3 access keys>
S3_SECRET_KEY=<from Supabase Storage S3 access keys>
```

`forcePathStyle` is already enabled in `MediaModule`. Verify presigned `GET` URLs against this endpoint before relying on it; that is the one behaviour not yet exercised against Supabase.

### What Supabase does not provide

Redis. The worker uses BullMQ over `ioredis`, so `REDIS_URL` still needs a separate provider. Supabase Auth and row-level security are deliberately unused: authentication, the granular RBAC matrix, and object-level authorization are owned by the API and covered by tests, and adopting either would create a second competing source of truth.

### Current limits

The project runs on the free tier on `t3.nano` with roughly 60 percent memory already in use and something still sending traffic to it, so it is suitable for development and staging only. Production needs its own project, compute sizing, backups (none are configured), and a reviewed connection limit.
