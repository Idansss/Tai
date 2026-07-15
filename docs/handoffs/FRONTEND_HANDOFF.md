# Frontend Handoff

## Current frontend phase

F1 — Public storefront (in progress). F0 foundation complete (PR #4, CI green). This branch
`claude/f1-storefront` is **stacked on `claude/f0-visual-foundation`** — merge F0 (#4) first.

### F1 progress this session

- Site chrome: accessible `SiteHeader` (native `<dialog>` mobile menu — focus trap, Esc,
  backdrop close, scroll lock, `aria-current`) + `SiteFooter` (labelled nav landmarks +
  newsletter form), wired into the root layout as the shared shell.
- Homepage refactored into editorial sections using the shared shell + reusable `ArtworkCard`.
- `/artworks` gallery listing (mock, loading skeletons, empty state) with **collection /
  availability / sort filters carried in the URL** (shareable, SSR), a desktop filter bar and an
  accessible mobile `<dialog>` filter drawer + active-filter chips; pure param parse/build is
  unit-tested (7 tests, first storefront Vitest suite). `/artworks/[slug]` gallery-style detail
  (breadcrumb, story, edition, related, Design Studio CTA, generateMetadata, segment not-found).
- 15 editorial/policy route scaffolds (real accessible placeholder pages) so nav never 404s.
- **Known defect TMS-F1-DEF-001:** `/artworks/[slug]` returns HTTP 200 (soft 404) for unknown
  slugs under Turbopack prod though the not-found UI renders correctly.
- Verified: full `pnpm check` green; served build smoke-tested (19 routes; valid detail 200,
  gallery lists mock artworks, mobile-menu dialog present).

## Work completed

- Read all control/contract/coordination files; confirmed `main` at `dd910ae9…`.
- Created branch `claude/f0-visual-foundation` from latest `main`.
- Base44 reference audited (computed design tokens extracted); `DESIGN_INVENTORY.md` written.
  Recorded that the live URL now serves a generic "moda.studio" template (content mismatch) —
  the master prompt/spec is authoritative for content.
- All persistent frontend docs created (master prompt verbatim, design inventory, design
  system, route inventory, accessibility, performance, visual-regression, content map).
- `packages/ui`: Tailwind v4 token layer (light + dark), typography + layout primitives, and 15
  foundation components with CVA variants; unit + a11y + token-contrast tests (35 passing).
- `apps/storefront`: Next.js App Router (TS strict), root layout (fonts/metadata/skip-link),
  root loading/error/not-found, editorial showcase homepage consuming the mock data provider,
  typed mock/api data-provider scaffold.
- `apps/admin`: Next.js App Router admin shell (sidebar/topbar, noindex), dashboard placeholder,
  root loading/error/not-found.
- Playwright harness (config + smoke/visual spec).
- Per-app `turbo.json` build outputs; `.gitignore` updated for `.next`/Playwright artifacts.

## Tasks verified

TMS-F0-001, -003, -004, -005, -006, -007, -008, -009, -011, -012.

## In-progress task

None active. Two F0 items are `Implemented` (not `Verified`) — see below.

## First recommended next task

TMS-F0-002 follow-up (capture Base44 PNG breakpoints) **or** TMS-F0-010 follow-up (generate
Playwright baselines), then begin **TMS-F1-001** (global navigation + accessible mobile menu).

## Routes completed

Storefront `/` (showcase homepage), `/_not-found`. Admin `/` (dashboard), `/_not-found`.
Root loading/error boundaries for both apps.

## Components completed

cn util; Button, IconButton, Link, Badge, Card, Price, Skeleton, Spinner, Alert, EmptyState,
ErrorState, VisuallyHidden; Container, Stack, Eyebrow, Heading, Text.

## API contracts consumed

`@tms/contracts`: `CursorPage` (data provider), plus available `OrderStatus`/`PaymentStatus`/
`ShippingStatus`/`DesignConfigurationInput`/`PaginationQuery` ready for F1+.

## Mock data still in use

- Storefront homepage featured artworks → `apps/storefront/lib/data/mock.ts` (mockProvider).
  Real catalogue endpoints pending (TMS-FBR-001). `apiProvider` is a loud-failing stub until
  then. No screen is marked fully API-integrated.

## Requests for Codex

- TMS-FBR-001 (catalogue read: `GET /api/v1/artworks`, `GET /api/v1/artworks/{slug}`) logged in
  `docs/coordination/FRONTEND_TO_BACKEND.md`. Non-blocking (mock adapter in use).

## Screenshots and visual tests

- Playwright config + smoke/visual spec scaffolded; **baselines not yet generated** (browser
  install + running server needed). In-app browser screenshots failed (pane timeouts).
- Functional visual evidence instead: served storefront returns HTTP 200 with hero, gallery,
  mock artwork ("Midnight in Lagos"), design-system section, dark-theme panel, skip link; CSS
  emits token vars + self-hosted Space Grotesk; 404 route returns HTTP 404 with recovery UI.

## Accessibility status

Baseline in place: AA token-contrast test (light+dark) passing; axe checks on primitives
passing; visible focus ring; reduced-motion handling; skip-to-content link; icon-only controls
labelled; zoom not restricted; status conveyed by text+icon, not colour alone. Route-level axe
sweeps begin in F1.

## Performance status

Foundation only. Fonts self-hosted (no external request), tokens are zero-JS CSS vars, both apps
prerender static in build. LCP/INP/CLS baselines captured when F1 homepage lands.

## Files changed

New: `docs/agents/CLAUDE_FRONTEND_MASTER_PROMPT.md`; `docs/frontend/{DESIGN_INVENTORY,
DESIGN_SYSTEM,ROUTE_INVENTORY,ACCESSIBILITY,PERFORMANCE,VISUAL_REGRESSION,CONTENT_MAP}.md`;
`packages/ui/**` (package.json, tsconfigs, eslint, vitest, styles, components, tokens, tests);
`apps/storefront/**` and `apps/admin/**` (Next apps); per-app `turbo.json`.
Updated: `docs/progress/FRONTEND_TODO.md`, `docs/handoffs/FRONTEND_HANDOFF.md`,
`docs/coordination/FRONTEND_TO_BACKEND.md`, `.ai/frontend-state.json`, `.gitignore` (shared,
additive).

## Commands run

`pnpm install`; `pnpm check` (format:check, lint, typecheck, test, build, db:validate) — all
pass; `pnpm audit --audit-level high --prod` — pass; served build via `next start` + curl checks.

## Test results

35 unit/a11y/contrast tests passing (`@tms/ui`). Typecheck: 16/16 tasks pass. Lint: 16/16 pass.
Build: 13/13 pass (both apps prerender). No app-level Vitest suites yet (Playwright covers e2e).

## Known defects

- **TMS-F1-DEF-001** — soft 404: `/artworks/[slug]` returns HTTP 200 instead of 404 for unknown
  slugs under the Next 16 Turbopack production server (correct not-found UI still renders).
  `notFound()` used correctly; the streamed shell commits 200 first. SEO impact only.
- F0 follow-ups outstanding: Base44 PNG screenshots, Playwright baselines.

## Blockers

None. Domain APIs unavailable (expected at B0) — mitigated with typed mock adapter.

## Do not redo

Foundation stack (Next 16 + React 19 + Tailwind v4 + TS strict), token system, primitives,
app scaffolds, and CI-green wiring are done and verified. Do not re-scaffold. Do not modify
Codex-owned dirs (`apps/api`, `apps/worker`, `packages/{database,integrations,email}`, `infra`).
`packages/contracts` is consume-only.

## Exact continuation instruction

Continue the Tai Manic Studios frontend build. Read AGENTS.md,
docs/MASTER_PRODUCT_SPEC.md, docs/agents/CLAUDE_FRONTEND_MASTER_PROMPT.md,
docs/progress/FRONTEND_TODO.md, docs/handoffs/FRONTEND_HANDOFF.md,
docs/contracts/API_CONTRACT.md, docs/coordination/BACKEND_TO_FRONTEND.md, docs/DECISIONS.md,
docs/TRACEABILITY_MATRIX.md and .ai/frontend-state.json. Pull latest main; create
`claude/f1-storefront` from it. Do not repeat Verified F0 tasks. Optionally close the two F0
follow-ups (Base44 PNGs, Playwright baselines), then start TMS-F1-001 (global navigation +
accessible mobile menu), TMS-F1-002 (homepage sections), TMS-F1-003 (footer). Use the mock data
adapter, record any new API needs in FRONTEND_TO_BACKEND.md, add tests, run `pnpm check`, and
mark tasks Verified only when all acceptance criteria pass.
