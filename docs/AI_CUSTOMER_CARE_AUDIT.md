# F.A.T.U Concierge — Repository Audit

**Date:** 2026-07-21  
**Branch:** `cursor/ai-customer-care`  
**Auditor:** Cursor agent (principal implementation pass)  
**Live storefront:** https://tai-storefront.vercel.app/

---

## 1. Executive summary

The monorepo already contains a production-shaped commerce stack (NestJS API + Prisma/Postgres + Next.js storefront/admin) and a **mock** customer assistant (`Studio Guide`, TMS-F5-008). There is **no** LLM provider, streaming chat endpoint, knowledge index, support-ticket system, or admin conversation console.

`apps/admin` **is** the connected management console for the same product (shared `@tms/contracts`, NestJS admin auth, same catalogue/orders domain). AI support management belongs there — not in a separate admin product. The Vercel project name `tai-admin` matches this app’s deployment role; relationship is verified via monorepo wiring, not assumed from naming alone.

---

## 2. Existing architecture

| Layer             | Technology                                            | Location                 |
| ----------------- | ----------------------------------------------------- | ------------------------ |
| Package manager   | pnpm 10.20 / Turbo 2.10                               | root `package.json`      |
| Storefront        | Next.js 16.2 App Router, React 19                     | `apps/storefront`        |
| Admin             | Next.js 16.2 App Router                               | `apps/admin`             |
| API               | NestJS 11, Express, Pino                              | `apps/api`               |
| Worker            | BullMQ consumer                                       | `apps/worker`            |
| Database          | Prisma 7 + PostgreSQL (Supabase-compatible)           | `packages/database`      |
| Contracts         | Shared TypeScript DTOs                                | `packages/contracts`     |
| UI / tokens       | `@tms/ui`, Tailwind v4, Space Grotesk + IBM Plex Sans | `packages/ui`            |
| Config            | Zod-validated env (`loadEnvironment`)                 | `packages/configuration` |
| Payments          | Flutterwave + mock provider                           | `apps/api/src/payments`  |
| Email             | `@tms/email`                                          | `packages/email`         |
| Analytics package | Present (lightweight)                                 | `packages/analytics`     |
| Tests             | Vitest everywhere; Playwright e2e on storefront       | various                  |

**Data-source policy (critical):** storefront uses per-domain composition in `apps/storefront/lib/data/index.ts`. API-capable today: `artworks`, `collections`, `drops`, `stories`. Still mock: `studio`, `products`, `passport`, `reviews`, `community`, `loyalty`, `delivery`. Cart/auth/orders use separate clients and `DATA_SOURCE=api` when the API is reachable. Default builds stay on mock so CI does not require a live API.

---

## 3. Reusable systems for the Concierge

| Capability               | Reuse                                                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Brand / policy copy      | `/about`, `/faq`, `/delivery`, `/returns`, `/size-guide`, `/care`, `/privacy`, `/terms`, `/cookies`, `/contact`, `/studio-guide` |
| Catalogue                | `dataProvider` + NestJS catalogue/artwork/garment modules                                                                        |
| Design Studio rules      | Garment compatibility APIs + storefront studio (ADR-013: approved placements only)                                               |
| Cart                     | `lib/cart-api.ts` → `POST/PATCH/DELETE /api/v1/cart/*` (never send prices)                                                       |
| Auth                     | `tms_session` HttpOnly cookie; `AuthProvider`                                                                                    |
| Orders / payment         | NestJS order state machine + Flutterwave handoff                                                                                 |
| Admin shell / RBAC       | `AdminShell`, admin session + MFA + permission guards                                                                            |
| Studio Guide UX patterns | `StudioGuideChat` — identity, suggestions, references, tool-error + retry, a11y log                                              |
| Observability            | Pino + correlation IDs; extend with concierge traces                                                                             |
| Rate limiting pattern    | `AuthRateLimiterService` — mirror for chat                                                                                       |

---

## 4. Missing infrastructure

- LLM provider abstraction and secrets (`AI_*` env vars)
- Streaming chat endpoint
- Intent router + tool orchestration
- Knowledge documents table / retrieval (no pgvector in schema today)
- Support tickets / human handoff queue
- Conversation persistence + retention
- Admin AI Customer Care section
- Analytics attribution for assisted commerce
- Prompt-injection / abuse controls beyond Studio Guide guardrails
- Knowledge sync job (worker)

**Existing AI surface:** deterministic mock only (`lib/studio-guide.ts`). Documented follow-up: **TMS-FBR-009**.

---

## 5. Data sources (source-of-truth map)

| Domain                                  | Source of truth                                               | Concierge access                                         |
| --------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------- |
| Artwork / collections / drops / stories | Postgres via API (when `DATA_SOURCE=api`) else mock seeds     | Live tools; never hardcode titles/prices                 |
| Products (artwork×garment)              | Composed on storefront; pricing from approved pairs (ADR-015) | Tool must resolve from catalogue services                |
| Studio options                          | Mock until FBR studio gap closes; API has compatible-garments | Validate via real compatibility endpoints when available |
| Cart                                    | NestJS cart service                                           | Mutating tools only with explicit customer intent        |
| Orders / payments                       | NestJS order + payment modules                                | Ownership-checked tools only                             |
| Delivery fees / VAT                     | Checkout path; delivery domain still mock on storefront       | Cite policy pages + checkout totals; do not invent fees  |
| Policies / FAQ                          | Static Next.js pages (editorial)                              | Indexed knowledge corpus + citations                     |
| Site CMS                                | `packages/site-content` Prisma models exist                   | Prefer when admin CMS is wired; otherwise page corpus    |
| Promotions                              | `Promotion` model                                             | Only when status ACTIVE                                  |

---

## 6. Admin relationship (verified)

- Same monorepo; ports 3000 (storefront) / 3001 (admin) / 4000 (API)
- Admin uses `@tms/contracts` and NestJS `/api/v1/admin-*` patterns
- Admin screens: orders, artworks, garments, production, customers, analytics, storyteller, errors
- **Conclusion:** integrate Concierge admin into `apps/admin`, not a new app

---

## 7. Integration risks

1. **Ownership split** — AGENTS.md: Codex owns API/DB; Claude owns storefront/admin. This epic necessarily crosses both (user-authorised). Changes must stay minimal and contract-aligned; record frontend impact in `docs/coordination/BACKEND_TO_FRONTEND.md`.
2. **Mock vs API** — Concierge must not silently invent catalogue facts when API is down (same honesty rule as `apiProvider`).
3. **No vector extension yet** — start with structured metadata + full-text / lexical retrieval over knowledge chunks; add pgvector later if needed.
4. **Streaming on NestJS vs Next** — Vercel favours Next route handlers for AI SDK streams; private tools and persistence stay on NestJS. Hybrid BFF is preferred.
5. **Cart mutations from AI** — must use existing cart API; never client-side price injection.
6. **Secrets** — never expose `AI_API_KEY` to the browser or admin UI.
7. **Current branch context** — work lands on `cursor/ai-customer-care` from `main`, not on unrelated feature branches.

---

## 8. Security concerns

- Prompt injection via customer text, product copy, stories, retrieved chunks
- Order IDOR if tools accept arbitrary references without session ownership checks
- PII leakage into model prompts / logs
- Abuse / cost runaway without rate limits and daily caps
- Support tickets must not store chain-of-thought
- Guest order lookup must use verification, not enumeration

---

## 9. Proposed architecture

```text
Customer → F.A.T.U Concierge UI (storefront)
        → POST /api/concierge/chat (Next.js Route Handler, streaming)
        → Intent + safety router
        → Provider layer (OpenAI-compatible; deterministic fallback when no key)
            ├── Knowledge retrieval (chunk store + lexical search)
            ├── Catalog / Design Studio tools → dataProvider or NestJS
            ├── Cart tools → NestJS cart (cookie-forwarded)
            ├── Order / payment tools → NestJS (authz)
            └── Escalation → SupportTicket API
        → NestJS persistence (conversations, tickets, analytics, knowledge sync)
        → Admin Concierge console
```

**Precedence:** live commerce records → admin settings/policies → catalogue/studio config → published pages → model general knowledge (never overrides business facts).

---

## 10. Exact files expected to change / add

### Documentation

- `docs/AI_CUSTOMER_CARE_*.md`, `docs/AI_*.md` (this suite)
- `docs/coordination/BACKEND_TO_FRONTEND.md` (new AI endpoints)
- `docs/coordination/FRONTEND_TO_BACKEND.md` (TMS-FBR-009 fulfilment notes)
- `.env.example`

### Database / contracts / config

- `packages/database/prisma/schema.prisma` + migration
- `packages/contracts/src/index.ts` (concierge DTOs)
- `packages/configuration/src/index.ts` (`AI_*` vars)

### API

- `apps/api/src/concierge/**` (module, controllers, services)
- `apps/api/src/app.module.ts`
- Optional worker job for knowledge sync

### Storefront

- `apps/storefront/app/api/concierge/**`
- `apps/storefront/lib/concierge/**`
- `apps/storefront/components/concierge/**`
- `apps/storefront/app/layout.tsx` (provider + launcher)
- Evolve `/studio-guide` to share Concierge identity

### Admin

- `apps/admin/app/concierge/**`
- `apps/admin/components/admin-shell.tsx` (nav)
- `apps/admin/lib/concierge/**`

### Tests

- Unit/integration under each app; Playwright scenarios for chat shell

---

## 11. Assumptions still requiring verification

| Assumption                                          | Status                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| Production `AI_API_KEY` / provider choice           | **Unverified** — env placeholders only                             |
| pgvector availability on Supabase                   | **Unverified** — lexical retrieval first                           |
| Exact VAT rate / delivery fee tables                | **Partial** — checkout calculates; storefront delivery domain mock |
| Guest order OTP flow                                | **Missing** — design verification before claiming guest tracking   |
| Legal finalisation of privacy retention copy        | **Draft** — document + admin retention setting                     |
| Vercel project `tai-admin` maps 1:1 to `apps/admin` | **Likely** via monorepo; confirm in deployment docs when deploying |

---

## 12. Business facts (seed — not hardcode into model)

Verified against FAQ / delivery / returns pages and product copy:

- Made-to-order; not pre-printed
- Production ~2–4 working days; delivery ~2–4 working days by state
- Classic tee true to size; size up for relaxed/oversized
- Faulty/incorrect corrected; change-of-mind returns not normally accepted
- Payments in NGN via Flutterwave (card / bank transfer)
- Totals include delivery + VAT before confirm
- Studio-approved artwork×garment×colour×placement only
- Brand does not routinely mark down made-to-order pieces

Catalogue names (Midnight in Lagos, Paper Tigers, collections, etc.) must come from live/mock data providers — never frozen into the system prompt.
