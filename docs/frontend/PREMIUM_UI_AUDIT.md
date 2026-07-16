# Premium UI Audit — existing storefront + admin (F6)

Owner: Claude Code · Tasks `TMS-UX0-002/003` · Basis: source review of every route in
`apps/storefront` and `apps/admin` plus the shared `packages/ui` primitives, on branch
`claude/f6-premium-ui-overhaul`.

Legend for "Changes required": **P0** must fix for the overhaul, **P1** should fix, **P2**
nice-to-have. Acceptance criteria (AC) are common unless noted: matches Direction A system,
WCAG 2.2 AA, no horizontal overflow 360–1440px, designed loading/empty/error states, no
console errors, reduced-motion safe.

---

## 0. System-wide findings (apply to nearly every route)

- **Strengths:** Clean semantic token layer; accessible primitives; consistent focus ring;
  real `loading`/`error`/`not-found` boundaries; a genuinely accessible custom `Select`; solid
  copy and Space Grotesk/IBM Plex voice.
- **Weaknesses (the overhaul target):**
  - Composition is **stacked, not composed** — every page is full-width `Container` sections
    of equal weight; no editorial rhythm, indices, or asymmetric grids.
  - **Cards everywhere** — surface/elevated cards used as the default wrapper, producing a
    "component library / dashboard" feel rather than framed gallery objects.
  - **Elevation & hairline language is thin** — only `shadow-sm/md`; no layered depth or
    intentional rule system.
  - **Accent under-used** — teal rarely appears; pages read monochrome-grey, not deliberate.
  - **Motion near-absent** — only micro transitions; no reveal/stagger/continuity.
  - **Hero is a plain text block** — no artwork presence, no memorable opening frame.
  - **Image treatment inconsistent** — ratios and matting not enforced app-wide.
- **Changes required (P0):** encode Direction A tokens (palette, type incl. mono meta, spacing
  rhythm, elevation, motion, image) in `packages/ui`; add `Reveal`/motion primitives, editorial
  `SectionIndex`/`Divider`, `Frame`/media primitives; refactor cards to framed objects.

---

## 1. Storefront routes

### `/` Home — P0
Purpose: first impression; route into shop + Design Studio. Strengths: clear CTAs, states
showcase. Weaknesses: text-only hero, equal-weight stacked sections, an on-page "Design system"
showcase band that belongs in docs not the storefront, generic featured grid. Hierarchy: no
dominant art moment. Motion: none. **Changes:** full editorial recompose — art-led hero,
numbered sections, featured artwork as framed objects, studio invitation as an immersive band,
marquee, reveal motion, memorable footer transition. Remove the dev "Design system" band from
the public page. AC + memorable opening frame, strong mobile composition.

### `/artworks` + `/artworks/[slug]` (+ `/passport`) — P0
Purpose: artwork-first gallery + gallery-style detail + provenance passport. Weaknesses: grid
likely uniform; filters (`artwork-filters.tsx`) need to become quiet sticky editorial controls
with custom Selects; detail lacks gallery matting and large-image focus; passport should feel
like a certificate. **Changes:** masonry/measured gallery grid, framed cards, sticky filter
rail, large art-focus detail (optional dark band), mono spec/passport meta. AC + zoomable art,
no stretch/blind-crop.

### `/collections` + `/collections/[slug]` — P1
Purpose: curated groupings. Weaknesses: card grid; collection detail lacks editorial cover.
**Changes:** editorial collection covers (16:9 framed), index list rhythm, campaign-scoped
accent band that stays within the system.

### `/shop` + `/products/[slug]` — P0
Purpose: product listing + PDP with configurator entry. Weaknesses: PLP cards flat; PDP media
+ purchase panel need premium hierarchy and mobile sticky action; `product-configurator.tsx`
selects/quantity must be system controls. **Changes:** dense-calm PLP (SSENSE/COS), framed
product media, spec-as-quiet-editorial, sticky mobile purchase bar, colour/size selectors as
accessible swatch/segmented controls. AC + sticky mobile CTA, AA swatches with non-colour cue.

### `/design-studio` (+ `/[configurationId]`) — P0
Purpose: interactive configurator; must feel like a premium tool. Weaknesses: reads as a form;
stage progression, live preview composition, front/back + zoom, summary and save/share/cart
need art-tool polish; mobile layout. **Changes:** staged tool shell (dark focus canvas),
preview-led composition, segmented controls, sticky summary, transitions between stages,
designed empty/loading/error. AC + clarity preserved, keyboard-complete, mobile usable.

### `/drops` + `/drops/[slug]` — P1
Purpose: timed limited drops. Strengths: countdown, status badge, early-access exist.
Weaknesses: needs drop-as-ritual treatment. **Changes:** mono numerals countdown, live status
chips, campaign accent band, waitlist form as system form. AC + countdown no-CLS.

### `/stories` + `/stories/[slug]`; `/community` — P1
Purpose: editorial + shoppable scenes + UGC gallery. Weaknesses: card grids; story detail lacks
long-form editorial measure; shoppable-scene hotspots need polish. **Changes:** editorial index,
measured prose (42rem), scene→shop flow, framed community grid with submit CTA.

### `/studio-guide`, `/about`, `/artist` — P1
Purpose: AI chat shell, brand, artist voice. Weaknesses: generic; about/artist should carry
brand voice + signature motif; chat shell should feel like a considered assistant panel, not a
purple-gradient bot. **Changes:** editorial about/artist with big display + portrait framing;
chat shell in-system (no generic AI gradient).

### `/cart`, `/checkout` (+ `/payment`, `/success`), cart drawer — P0
Purpose: commerce completion. Weaknesses: must be calm/trustworthy; drawer + summary + steps
need focus and explicit states; promo/stock warnings; mobile sticky totals. **Changes:**
single-column focused checkout (Stripe-calm), quiet order summary, explicit processing/pending/
success/failed states, sticky mobile action, promo entry as system form. AC + success only on
verified state (preserve logic), all payment states designed.

### `/account/*` (overview, orders, order detail, saved-designs, wishlist, loyalty, profile),
`/login`, `/register`, `/search`, policy pages — P1
Weaknesses: account shell nav plain; order detail/tracking timeline need editorial timeline;
auth forms generic; policy pages need editorial prose. **Changes:** quiet account shell, status
timeline component, system forms + validation, editorial policy/prose template, empty states.

---

## 2. Admin routes (`apps/admin`)

### `/` dashboard, `/analytics` — P1
Purpose: operational metrics + charts. Weaknesses: metric/chart presentation likely default;
needs operational-calm dashboard (Linear/Vercel), subtle elevation, accessible charts.
**Changes:** refined metric tiles, quiet charts with non-colour encoding, designed empty states.

### `/orders` (+ `[reference]`), `/production`, `/customers` (+ `[id]`) — P0
Purpose: dense operational tables + detail + production board + QC. Weaknesses: tables need the
refined DataTable dialect (crisp rows, sticky headers, quiet zebra, keyboard), status chips,
mobile/tablet behaviour; production board needs calm columns. **Changes:** admin table system,
status chips (non-colour cue), filter/toolbar with system Selects, responsive table→stack.

### `/artworks` (+ `new`, `[id]`), `/garments` (+ `[id]`) — P1
Purpose: catalogue management, upload, inventory/print-area matrices. Weaknesses: forms/upload/
matrix need system form + FileUploader + matrix table polish. **Changes:** system forms,
accessible file upload, inventory matrix as quiet grid.

### `/storyteller`, `/errors`, `/login`, error/empty/not-found — P1
Weaknesses: Brand Storyteller must use the system (no generic AI gradient); error centre as calm
ops list; admin login quiet + branded. **Changes:** in-system AI draft UI, error-centre table,
branded quiet login.

---

## 3. Shared components to build/upgrade (drives most routes)

- **Tokens:** palette refine, mono meta face, elevation scale, motion tokens, image ratios.
- **New primitives:** `Reveal` (motion), `SectionIndex`/`Divider` (editorial rhythm),
  `Frame`/`Media` (image system), `Marquee`, `Field`/`Input`/`Textarea` + `ValidationMessage`,
  `Combobox`, `SegmentedControl`, `Swatch`/`SizeSelector`, `QuantityControl`, `StatusTimeline`,
  `DataTable`, `Modal`/`Drawer` (portal), `Tabs`, `Toast`.
- **Upgrade:** `Select` — add portal positioning for viewport-edge/in-drawer safety; visual
  polish. `Card` → framed-object variants. `Button`/`Badge` → refined premium states.
- **Dropdown audit:** every user-facing select in storefront (`artwork-filters`,
  `product-configurator`, checkout, account) and admin (order/production/customer toolbars,
  garment/inventory forms) must use the system `Select`/`Combobox` — no native-looking control.

---

## 4. Route redesign priority order

1. Design-system reconstruction (UX1) — unblocks everything.
2. Landing page (UX2) — flagship first impression.
3. Shared chrome (header, footer, cart drawer) — visible on every route.
4. Storefront catalogue (artworks, shop, product, collections) — UX3.
5. Design Studio — UX4.
6. Commerce + account — UX5.
7. Admin — UX6.
8. Hardening (UX7).
