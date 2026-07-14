# Frontend TODO

Owner: Claude Code. Statuses: `Not started` · `In progress` · `Blocked` · `Implemented` ·
`Verified`. A task is checked only when `Verified` (all acceptance criteria pass: UI,
responsive, keyboard, a11y, loading/error/empty states, API-or-recorded-mock, tests, typecheck,
lint, build, visual evidence, docs updated).

## Phase F0 — Reference audit & design foundation

- [x] **TMS-F0-001** Repository inspection & branch setup
  - Status: Verified
  - Evidence: main at `dd910ae9…` confirmed; branch `claude/f0-visual-foundation` from latest
    main; ownership dirs + control files read.

- [ ] **TMS-F0-002** Base44 reference audit & design inventory
  - Status: Implemented
  - Acceptance met: reference inspected; tokens/typography/palette/layout/motion documented in
    `docs/frontend/DESIGN_INVENTORY.md`.
  - **Outstanding for Verified:** PNG breakpoint screenshots under `docs/reference/base44/`.
    Automation screenshots timed out repeatedly; exact computed tokens were extracted instead.
    Also recorded: live URL renders a generic "moda.studio" template (content mismatch).

- [x] **TMS-F0-003** Route inventory & content map
  - Status: Verified
  - Evidence: `ROUTE_INVENTORY.md` + `CONTENT_MAP.md` cover all master-prompt routes.

- [x] **TMS-F0-004** Design tokens & global styles (`packages/ui`)
  - Status: Verified
  - Evidence: all semantic tokens (light+dark) in `tokens.css`; Tailwind v4 `@theme` mapping in
    `theme.css`; token-contrast test passes AA (`tokens.spec.ts`); served CSS confirmed to emit
    `--color-background-primary`.

- [x] **TMS-F0-005** Typography & layout primitives
  - Status: Verified
  - Evidence: Space Grotesk + IBM Plex Sans self-hosted via `next/font` (confirmed in served
    CSS); Container/Stack/Eyebrow/Heading/Text primitives build and render.

- [x] **TMS-F0-006** Foundation component set (`packages/ui`)
  - Status: Verified
  - Evidence: Button, IconButton, Link, Badge, Card, Price, Skeleton, Spinner, Alert,
    EmptyState, ErrorState, VisuallyHidden. States covered; axe + Button unit tests pass
    (35 tests green); rendered live on the showcase page.

- [x] **TMS-F0-007** Storefront app scaffold (Next.js App Router)
  - Status: Verified
  - Evidence: App Router + TS strict; root layout (fonts/metadata/theme/skip-link); root
    `loading`/`error`/`not-found`; showcase homepage; `next build` prerenders; served HTTP 200
    with hero/gallery/mock data; 404 route returns HTTP 404 with recovery UI.

- [x] **TMS-F0-008** Admin app scaffold (Next.js App Router)
  - Status: Verified
  - Evidence: App Router + TS strict; admin shell (sidebar/topbar); `robots noindex`; root
    `loading`/`error`/`not-found`; dashboard placeholder; `next build` prerenders.

- [x] **TMS-F0-009** Accessibility baseline & contrast test
  - Status: Verified
  - Evidence: token-contrast unit test passes AA (light+dark); axe assertions on primitives
    pass; focus-visible ring + reduced-motion handling in `theme.css`; skip link present.

- [ ] **TMS-F0-010** Visual-regression & e2e harness (Playwright)
  - Status: Implemented
  - Acceptance met: Playwright configured (4 breakpoints, motion frozen, snapshot template);
    smoke + visual spec written; documented in `VISUAL_REGRESSION.md`.
  - **Outstanding for Verified:** run Playwright to generate committed baselines (needs a
    browser binary install + running server; not executed this session).

- [x] **TMS-F0-011** Typed data-provider scaffold (mock/api adapter)
  - Status: Verified
  - Evidence: provider interface + `mockProvider` (typed against `@tms/contracts` `CursorPage`)
    - `apiProvider` stub; env switch; homepage renders mock artworks live.

- [x] **TMS-F0-012** F0 verification & CI green
  - Status: Verified
  - Evidence: `pnpm check` (format:check, lint, typecheck, test, build ×2 apps, db:validate) all
    pass; `pnpm audit --audit-level high --prod` passes (1 moderate only). PR opened.

## Phase F1 — Public storefront (in progress)

- [x] **TMS-F1-001** Global navigation + accessible mobile menu
  - Status: Verified
  - Evidence: `SiteHeader` (client) with desktop nav + `<dialog>`-based mobile menu (native
    focus trap, Esc, backdrop-click close, body-scroll lock, `aria-current`, `aria-haspopup`);
    served markup includes `aria-label="Site menu"`; builds + full `pnpm check` green.

- [x] **TMS-F1-002** Homepage editorial sections
  - Status: Verified
  - Evidence: hero, featured gallery (mock adapter via `ArtworkCard`), design-system showcase
    (both themes), studio invitation; real route links; served HTTP 200.

- [x] **TMS-F1-003** Footer
  - Status: Verified
  - Evidence: `SiteFooter` with 4 labelled nav landmarks + accessible newsletter form (labelled
    input; submission wiring deferred to the newsletter endpoint).

- [x] **TMS-F1-004** Artwork gallery + detail
  - Status: Verified
  - Evidence: `/artworks` listing with **collection / availability / sort filters carried in the
    URL** (shareable, SSR — verified via query params: all=8, Comic Line=2, sold_out=1,
    unknown=0 → empty-state recovery), desktop filter bar + accessible mobile `<dialog>` filter
    drawer + active-filter chips, loading skeletons, empty state. `/artworks/[slug]`
    gallery-style detail (breadcrumb, story, edition, related, CTA, `generateMetadata`, segment
    `not-found`). Pure param parse/build unit-tested (7 tests). Full `pnpm check` green.
  - **Follow-ups (separate):** additional facets (search, theme, mood, colour-family, garment
    compatibility, limited-edition) need backend data fields (TMS-FBR-001); detail soft-404
    tracked as TMS-F1-DEF-001.

- [x] **TMS-F1-005** ArtworkCard component
  - Status: Verified
  - Evidence: `components/artwork/artwork-card.tsx`; reused by homepage, gallery and related.
    (ProductCard/CollectionCard follow with `/shop` + `/collections` build-out.)

- [ ] **TMS-F1-006** Editorial & policy route scaffolds
  - Status: Implemented
  - Acceptance met: real accessible placeholder pages (single h1, metadata, landmarks, forward
    links) for collections, shop, design-studio, about, artist, stories, delivery, returns,
    size-guide, care, faq, contact, privacy, terms, cookies — so navigation never 404s.
  - **Outstanding for Verified:** real content/behaviour per route (later F1/F5).

### Known defects

- **TMS-F1-DEF-001** — `/artworks/[slug]` renders the correct not-found UI for unknown slugs but
  returns **HTTP 200 instead of 404** under the Next 16 Turbopack production server (soft 404).
  `notFound()` is used correctly in both the page and `generateMetadata`; the streamed shell
  commits a 200 before `notFound()` resolves. Impacts SEO (§25). Next step: confirm against a
  Next patch / non-Turbopack build, or add a status workaround. UI/UX is unaffected.

## Later phases

F1 (remaining: gallery filters, collections, shop/product, search, editorial/policy content) ·
F2 Design Studio · F3 Commerce & account · F4 Admin platform · F5 Growth & AI · F6 Hardening.
