# @tms/site-content

Frontend-owned **CMS persistence + services** for editable website content. Consumed by
`apps/admin` (writes) and `apps/storefront` (reads).

## Boundary

Owned by Claude Code (frontend), per [AGENTS.md](../../AGENTS.md). It lives in the **`cms` Postgres
schema**, isolated from the backend's `public` tables (owned by `@tms/database` / Codex) in the same
database — nothing here can touch identity, catalogue or commerce tables. Commerce & operations stay
Codex-owned and are reached through the admin provider seam (`apps/admin/lib/data`) and the
`TMS-FBR-009` contract in `docs/coordination/FRONTEND_TO_BACKEND.md`.

The **interim admin identity** here (`cms.admin_users`, roles Owner / Administrator / Restricted
staff, cookie sessions, scrypt passwords) is deliberately self-contained so content control is
genuinely permission-enforced and audited today. It defers to Codex's admin auth + granular RBAC
(`/api/v1/admin/auth`, backend task B1-003) when that lands.

## What it manages

Announcements, homepage sections/hero, editable pages (About, FAQ, policies…), navigation / footer /
social links, per-route SEO, redirects, studio-guide content, site settings / feature flags /
maintenance / business details, and a media library. See
[`docs/admin/SITE_ADMIN_CONTROL_MAP.md`](../../docs/admin/SITE_ADMIN_CONTROL_MAP.md) for the full
site→admin map and current status. (Announcements + audit log are live end-to-end; the rest share the
same proven pattern.)

## Setup

```bash
# Point at the CMS schema (this machine maps Postgres to host port 5433; compose default is 5432)
export CMS_DATABASE_URL="postgresql://tai:local_development_only@localhost:5433/tai_manic?schema=cms"

pnpm --filter @tms/site-content db:generate   # generate the Prisma client
pnpm --filter @tms/site-content db:push       # sync the cms schema
pnpm --filter @tms/site-content db:seed       # owner admin + business details + starter content
pnpm --filter @tms/site-content build         # emit dist consumed by the apps
pnpm --filter @tms/site-content test          # lifecycle integration tests (needs CMS_DATABASE_URL)
```

Both apps read `CMS_DATABASE_URL` (see each app's `.env.local`; documented in root `.env.example`).
The default seed owner is `owner@taimanic.local` (password from `CMS_SEED_OWNER_PASSWORD`, default
`ChangeMe!Owner1`) — change it before any shared use. `CMS_TOKEN_PEPPER` peppers session digests.

## Migrations

Dev uses `db:push`. A baseline DDL snapshot lives in `prisma/migrations/0001_cms_foundation.sql` for
reproducibility; a formal Prisma migration history can be adopted once the schema stabilises.
