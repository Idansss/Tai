# Site → Admin Control Map

The single persistent checklist that maps **every editable part of the public Tai Manic
Studios website** to the admin control that manages it. This is the source of truth for the
"admin control centre" programme.

## How to read this

Each row is a manageable feature. A feature is **Complete** only when **every** column below is
verified — a partial build is never checked.

| Column   | Meaning                                                                                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **DB**   | A persisted, migrated data model backs it (not hard-coded, not mock).                                                                                                    |
| **API**  | A server route/endpoint reads & mutates it with input validation.                                                                                                        |
| **RBAC** | Server-side permission enforcement (owner / administrator / restricted staff).                                                                                           |
| **UI**   | Admin screen with create/edit/publish/unpublish/reorder/archive/delete as applicable, plus loading / empty / success / error states and destructive-action confirmation. |
| **Val**  | Input validation + business rules (server-authoritative).                                                                                                                |
| **Test** | Automated tests covering the model + at least the mutation path.                                                                                                         |
| **Live** | The public storefront reflects the change after publish + refresh.                                                                                                       |

Status keys: `✅ done` · `🚧 in progress` · `⬜ todo` · `🔗 wired` (admin UI wired to the
API seam; awaiting the backend endpoint) · `— n/a`.

## Ownership & boundary

This repo is a **two-agent build** ([AGENTS.md](../../AGENTS.md)):

- **CMS (this agent — Claude Code)** owns _editable website content_: a frontend-owned
  persistence layer, `@tms/site-content`, backed by the **`cms` Postgres schema** (isolated from
  the backend's `public` tables in the same database). Consumed by `apps/admin` (writes) and
  `apps/storefront` (reads).
- **Codex (backend agent)** owns _commerce & operations_: `apps/api`, `apps/worker`,
  `packages/database` (`public` schema), `packages/contracts` (OpenAPI). Its programme is
  [BACKEND_TODO.md](../progress/BACKEND_TODO.md) (B1-003 → B7, mostly **Not started**).

For Codex-owned domains the admin gets the **full control UI wired to the provider seam**
(`apps/admin/lib/data`) plus a precise contract filed in
[FRONTEND_TO_BACKEND.md](../coordination/FRONTEND_TO_BACKEND.md); those rows are marked `🔗 wired`
until the endpoint lands. **Admin identity/RBAC** is ultimately Codex's (B1-003); until it lands
the CMS runs an **interim server-side admin session** (`cms.admin_users`) so content control is
genuinely permission-enforced and audited today, and defers to `/api/v1/admin/auth` on delivery.

---

## A. Editable website content — CMS-owned (real DB now)

### A1. Homepage & merchandising

| Feature           | Public surface    | Admin control                                                          | DB  | API | RBAC | UI  | Val | Test | Live |
| ----------------- | ----------------- | ---------------------------------------------------------------------- | :-: | :-: | :--: | :-: | :-: | :--: | :--: |
| Announcement bar  | site-wide top bar | Content ▸ Announcements (CRUD, schedule, reorder, archive)             | ✅  | ✅  |  ✅  | ✅  | ✅  |  ✅  |  ✅  |
| Hero content      | `/` hero          | Content ▸ Homepage ▸ Hero (headline, sub, CTAs, featured image)        | ✅  | ✅  |  ✅  | ✅  | ✅  |  🚧  |  ✅  |
| Studio band       | `/` studio section| Content ▸ Homepage ▸ Studio band (text + image + CTAs)                 | ✅  | ✅  |  ✅  | ✅  | ✅  |  🚧  |  ✅  |
| Homepage sections | `/` section order | Content ▸ Homepage (hero + studio live; more sections + reorder to add)| 🚧  | 🚧  |  ✅  | 🚧  | ✅  |  🚧  |  🚧  |
| Banners / promos  | `/` banners       | Content ▸ Banners (CRUD, schedule)                                     | ⬜  | ⬜  |  ⬜  | ⬜  | ⬜  |  ⬜  |  ⬜  |
| Featured items    | `/` featured rows | Content ▸ Homepage ▸ Featured (curate references to artworks/products) | ⬜  | ⬜  |  ⬜  | ⬜  | ⬜  |  ⬜  |  ⬜  |

### A2. Information & policy pages

| Feature    | Public surface | Admin control                    | DB  | API | RBAC | UI  | Val | Test | Live |
| ---------- | -------------- | -------------------------------- | :-: | :-: | :--: | :-: | :-: | :--: | :--: |
| About      | `/about`       | Content ▸ Pages ▸ About          | ⬜  | ⬜  |  ⬜  | ⬜  | ⬜  |  ⬜  |  ⬜  |
| Artist     | `/artist`      | Content ▸ Pages ▸ Artist         | ⬜  | ⬜  |  ⬜  | ⬜  | ⬜  |  ⬜  |  ⬜  |
| Contact    | `/contact`     | Content ▸ Pages ▸ Contact        | ⬜  | ⬜  |  ⬜  | ⬜  | ⬜  |  ⬜  |  ⬜  |
| FAQ        | `/faq`         | Content ▸ Pages ▸ FAQ (Q&A list) | ⬜  | ⬜  |  ⬜  | ⬜  | ⬜  |  ⬜  |  ⬜  |
| Delivery   | `/delivery`    | Content ▸ Pages ▸ Delivery       | ⬜  | ⬜  |  ⬜  | ⬜  | ⬜  |  ⬜  |  ⬜  |
| Returns    | `/returns`     | Content ▸ Pages ▸ Returns        | ⬜  | ⬜  |  ⬜  | ⬜  | ⬜  |  ⬜  |  ⬜  |
| Care       | `/care`        | Content ▸ Pages ▸ Care           | ⬜  | ⬜  |  ⬜  | ⬜  | ⬜  |  ⬜  |  ⬜  |
| Privacy    | `/privacy`     | Content ▸ Pages ▸ Privacy        | ⬜  | ⬜  |  ⬜  | ⬜  | ⬜  |  ⬜  |  ⬜  |
| Terms      | `/terms`       | Content ▸ Pages ▸ Terms          | ⬜  | ⬜  |  ⬜  | ⬜  | ⬜  |  ⬜  |  ⬜  |
| Cookies    | `/cookies`     | Content ▸ Pages ▸ Cookies        | ⬜  | ⬜  |  ⬜  | ⬜  | ⬜  |  ⬜  |  ⬜  |
| Size guide | `/size-guide`  | Content ▸ Pages ▸ Size guide     | ⬜  | ⬜  |  ⬜  | ⬜  | ⬜  |  ⬜  |  ⬜  |

### A3. Navigation, footer & business identity

| Feature                  | Public surface      | Admin control                                             | DB  | API | RBAC | UI  | Val | Test | Live |
| ------------------------ | ------------------- | --------------------------------------------------------- | :-: | :-: | :--: | :-: | :-: | :--: | :--: |
| Primary navigation       | header links        | Content ▸ Navigation (CRUD, reorder, publish)             | ⬜  | ⬜  |  ⬜  | ⬜  | ⬜  |  ⬜  |  ⬜  |
| Footer links             | footer columns      | Content ▸ Footer (CRUD, reorder, group)                   | ⬜  | ⬜  |  ⬜  | ⬜  | ⬜  |  ⬜  |  ⬜  |
| Social links             | header/footer icons | Content ▸ Social links                                    | ⬜  | ⬜  |  ⬜  | ⬜  | ⬜  |  ⬜  |  ⬜  |
| Business contact details | contact/footer      | Content ▸ Business details (email, phone, address, hours) | ⬜  | ⬜  |  ⬜  | ⬜  | ⬜  |  ⬜  |  ⬜  |

### A4. SEO, community copy & studio guide content

| Feature              | Public surface   | Admin control                                                           | DB  | API | RBAC | UI  | Val | Test | Live |
| -------------------- | ---------------- | ----------------------------------------------------------------------- | :-: | :-: | :--: | :-: | :-: | :--: | :--: |
| SEO per route        | `<head>` meta    | Content ▸ SEO (title, description, social image, canonical)             | ⬜  | ⬜  |  ⬜  | ⬜  | ⬜  |  ⬜  |  ⬜  |
| Redirects            | old→new URLs     | Content ▸ Redirects                                                     | ⬜  | ⬜  |  ⬜  | ⬜  | ⬜  |  ⬜  |  ⬜  |
| Newsletter copy      | signup blocks    | Content ▸ Newsletter copy (content only; sends = Codex email)           | ⬜  | ⬜  |  ⬜  | ⬜  | ⬜  |  ⬜  |  ⬜  |
| Studio Guide content | `/studio-guide`  | Content ▸ Studio Guide (intro, suggested questions, knowledge snippets) | ⬜  | ⬜  |  ⬜  | ⬜  | ⬜  |  ⬜  |  ⬜  |
| Media library        | image references | Content ▸ Media (upload / replace / delete)                             | ⬜  | ⬜  |  ⬜  | ⬜  | ⬜  |  ⬜  |  ⬜  |

### A5. Site settings, flags & platform admin (CMS-owned)

| Feature               | Public/System surface | Admin control                                                        | DB  | API | RBAC | UI  | Val | Test | Live |
| --------------------- | --------------------- | -------------------------------------------------------------------- | :-: | :-: | :--: | :-: | :-: | :--: | :--: |
| Site settings         | site metadata         | Settings ▸ General                                                   | ⬜  | ⬜  |  ⬜  | ⬜  | ⬜  |  ⬜  |  ⬜  |
| Maintenance mode      | whole site            | Settings ▸ Maintenance                                               | ⬜  | ⬜  |  ⬜  | ⬜  | ⬜  |  ⬜  |  ⬜  |
| Feature flags         | UI toggles            | Settings ▸ Feature flags                                             | ⬜  | ⬜  |  ⬜  | ⬜  | ⬜  |  ⬜  |  ⬜  |
| Notification settings | admin/email prefs     | Settings ▸ Notifications                                             | ⬜  | ⬜  |  ⬜  | ⬜  | ⬜  |  ⬜  |  ⬜  |
| Admin users & roles   | — (admin)             | Settings ▸ Staff (interim `cms.admin_users`; defers to Codex B1-003) | ✅  | 🚧  |  ✅  | ⬜  | 🚧  |  🚧  |  —   |
| Audit log             | — (admin)             | Content ▸ Audit log (who/what/when)                                  | ✅  | ✅  |  ✅  | ✅  |  —  |  ✅  |  —   |

---

## B. Commerce & operations — Codex-owned (admin UI wired to API seam)

Admin UI already exists on the typed mock provider; each row becomes live when its backend
endpoint lands. Contract filed in [FRONTEND_TO_BACKEND.md](../coordination/FRONTEND_TO_BACKEND.md).

| Domain                                                    | Admin control (exists)             | Backend task    | Contract        | Wired |
| --------------------------------------------------------- | ---------------------------------- | --------------- | --------------- | :---: |
| Artworks / versions / designs                             | Artworks list + detail             | B2-001          | TMS-FBR-007     |  🔗   |
| Collections / drops / stories                             | (to build on catalogue API)        | B2-002          | TMS-FBR-001/008 |  ⬜   |
| Garments / colours / sizes / stock / placements / mockups | Garments list + detail + inventory | B2-003 / B2-004 | TMS-FBR-007     |  🔗   |
| Products / prices                                         | Garments (variant pricing)         | B2-003          | TMS-FBR-002     |  🔗   |
| Orders / payments / refunds                               | Orders list + detail + actions     | B4-003 / B5-001 | TMS-FBR-004/007 |  🔗   |
| Production / QC / fulfilment / delivery                   | Production board + transitions     | B6-001          | TMS-FBR-007     |  🔗   |
| Customers                                                 | Customers list + detail            | B6-002          | TMS-FBR-007     |  🔗   |
| Inventory & stock adjustments                             | Garment inventory matrix           | B4-001          | TMS-FBR-007     |  🔗   |
| Promotions / discounts                                    | (to build)                         | B4-002          | TMS-FBR-003     |  ⬜   |
| Waitlists / pre-orders / limited drops                    | (to build)                         | B7-001          | TMS-FBR-008     |  ⬜   |
| Reviews / community moderation                            | (to build)                         | B7-001          | —               |  ⬜   |
| Analytics / revenue / conversion / performance            | Analytics view                     | B6-002          | TMS-FBR-007     |  🔗   |
| AI drafts & approval workflow                             | Brand Storyteller view             | B7-002 / B7-003 | —               |  🔗   |
| Integration status / failed jobs / webhook errors / retry | Error centre                       | B6-002          | TMS-FBR-007     |  🔗   |
| Staff accounts / roles / permissions (system)             | Settings ▸ Staff (interim CMS)     | B1-003          | TMS-FBR-006     |  ⬜   |

---

## C. Cross-cutting requirements (apply to every CMS row)

- [ ] Owner / administrator / restricted-staff roles, server-side enforced
- [ ] Draft / scheduled / published / archived lifecycle states
- [ ] Destructive-action confirmation in the UI
- [ ] Soft delete + restore where recovery matters
- [ ] Audit log: actor, action, resource, before/after, timestamp
- [ ] Search, filter, pagination, bulk actions on list screens
- [ ] Media upload / replace / delete
- [ ] Loading / success / empty / error states everywhere
- [ ] Responsive desktop + tablet admin
- [ ] No raw credentials / secrets / source exposed to ordinary admins

## Progress log

- **2026-07-16 (homepage editing + checkout gating)** — Shipped and verified:
  - **Homepage hero + studio band are CMS-editable** (`content/homepage`): headline/subtitle/CTAs
    and the **featured/studio images**, saved as draft or published. Storefront reads published
    content (cached, fails safe to built-in defaults). Verified end-to-end over HTTP: edit → publish
    → storefront renders the change → revert. Validation (bad URL → 422) and RBAC enforced.
  - **Checkout requires sign-in** (storefront): guests get a clear "Sign in to check out" CTA and are
    redirected to `/login?next=/checkout`; the bag persists locally and is intact on return (login
    and register both honour `next`). The checkout flow is guarded server-of-truth via `useRequireAuth`.
- **2026-07-16 (foundation + first verticals)** — Shipped and verified end-to-end:
  - `@tms/site-content` package: Prisma in the isolated `cms` schema (12 tables), typed client,
    services, seed. Schema pushed to the running DB; baseline DDL in `prisma/migrations/`.
  - Interim **server-side admin auth** (httpOnly cookie, scrypt passwords, `cms.admin_users`),
    **RBAC** (Owner / Administrator / Restricted staff) enforced in every route handler, and an
    immutable **audit log**.
  - **Announcements** vertical complete: admin CRUD + draft/scheduled/published/archived +
    reorder + soft-delete/restore, permission-gated, validated, audited — and the **storefront
    announcement bar renders the published item live**. Verified by integration tests (4 passing
    against the real DB) and a full HTTP smoke (401/403/422/201/200 + storefront HTML render).
  - **Audit log viewer** (read-only, `audit.read`).
  - Admin console converted from a client-only mock session to the **real server session**; all
    125 existing admin unit tests still pass.
- **2026-07-16 (map created)** — Architecture chosen: `@tms/site-content` (CMS Postgres schema)
  for editable content; provider seam + `TMS-FBR-009` contract for commerce/ops.

### Next verticals (same proven pattern)

The schema already models pages, homepage sections, nav/footer/social links, SEO, redirects,
settings, studio-guide and media. Each remaining CMS row needs only: a service in
`@tms/site-content`, route handlers under `apps/admin/app/api/cms/*`, an admin screen, and a
storefront read — following the announcements vertical exactly.
</content>
</invoke>
