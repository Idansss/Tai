# F.A.T.U Concierge — Implementation TODO

Markers: `[ ]` not started · `[~]` in progress · `[x]` completed and verified · `[!]` blocked

---

## Phase 0 — Repository audit

- [x] Inspect monorepo architecture, commerce flows, admin relationship
- [x] Write `docs/AI_CUSTOMER_CARE_AUDIT.md`
- [x] Write `docs/AI_CUSTOMER_CARE_SPEC.md`
- [x] Create branch `cursor/ai-customer-care` from `main`

---

## Phase 1 — AI foundation

- [x] Provider abstraction (`mock` + OpenAI-compatible polish)
- [x] Secure streaming chat endpoint (storefront BFF NDJSON)
- [x] Intent and safety router
- [x] Versioned system prompt
- [x] Rate limiting + request size limits
- [x] Observability (conversation/request ids in stream final)
- [x] Storefront Concierge UI shell (launcher + panel)
- [~] Wire session persistence to NestJS when API reachable (endpoint exists; BFF persist optional follow-up)

---

## Phase 2 — Knowledge system

- [x] Knowledge schema (Prisma + contracts)
- [x] Seed corpus from policy/editorial pages
- [x] Lexical retrieval + source precedence
- [x] Customer-friendly citations
- [x] Sync endpoint + checksum/version tracking
- [~] Admin knowledge list UI (read); full CRUD article editor pending
- [ ] Automatic re-index on content publish hooks

---

## Phase 3 — Shopping concierge

- [x] Catalog search / artwork / collection / price tools (grounded)
- [x] Product cards in chat
- [x] Recommendation flow (2–4 options)
- [x] Design Studio guidance + validation helpers
- [x] Page context awareness
- [x] Cart read / guarded add (API when available)
- [ ] Deep-link full studio state persistence end-to-end on API studio domain

---

## Phase 4 — Customer care

- [x] Sizing / delivery / returns / payment grounded answers
- [x] Authenticated order lookup tool (ownership-checked via API)
- [x] Support ticket creation + human handoff flow
- [x] Fault / complaint classification helpers
- [!] Guest order verification (OTP) — needs product decision / backend
- [!] Secure image upload for fault reports — needs media pipeline wiring

---

## Phase 5 — Admin and analytics

- [x] Admin Concierge section (conversations, tickets, knowledge, metrics, settings readout)
- [x] Analytics event definitions + ticket-created event writer
- [ ] Role permissions seed (`concierge:*`)
- [ ] Assisted conversion attribution end-to-end with checkout

---

## Phase 6 — Hardening

- [x] Security & privacy documentation
- [x] Operations runbook
- [x] Prompt-injection tests (unit)
- [ ] Full accessibility audit pass
- [ ] Load / abuse testing in staging
- [ ] Mobile QA on real devices

---

## Phase 7 — Release verification

- [x] `pnpm --filter @tms/storefront test` — 309 passed
- [x] `pnpm --filter @tms/configuration test` — 7 passed
- [x] `pnpm --filter @tms/storefront typecheck` / `lint` / `build` — green (`/api/concierge/chat` in route table)
- [x] `pnpm --filter @tms/admin typecheck` / `lint` / `build` — green (`/concierge` route)
- [x] `pnpm --filter @tms/api typecheck` / `lint` / `build` — green
- [x] `pnpm --filter @tms/database db:validate` — valid
- [ ] Playwright Concierge smoke (open/minimise/keyboard)
- [ ] Full monorepo `pnpm check` on CI with migration applied

---

## Blockers / external dependencies

- [!] `AI_API_KEY` / production provider account — not in repo; mock provider is default
- [!] Guest order OTP — no existing endpoint
- [!] pgvector — not confirmed; lexical retrieval used
- [!] DB migration must be deployed before ticket/conversation persistence writes succeed
- [!] Crossing AGENTS ownership (API/DB vs storefront/admin) — authorised by master prompt
