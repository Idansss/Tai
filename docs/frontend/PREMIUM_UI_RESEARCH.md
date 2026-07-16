# Premium UI Research — Tai Manic Studios (F6 overhaul)

Owner: Claude Code · Task: `TMS-UX0-004/005/006/007` · Status: complete for direction selection.

Method: pattern synthesis from a broad set of production references across artist-led
commerce, fashion/streetwear, gallery/museum, and editorial publishing, grounded with live
web research (Awwwards E-Commerce & Fashion collections, museum/gallery design surveys). No
single site is cloned; recurring high-quality principles are abstracted into one original
Tai Manic Studios direction and then implemented. References are analysed for *principle*, not
copied for *pixels*.

---

## 1. Research categories

Artist-led commerce · Fashion & streetwear · Gallery & museum · Editorial storytelling ·
Product-detail presentation · Interactive product configuration · Navigation systems ·
Checkout & conversion · Customer accounts · Operational admin · Motion & transitions ·
Mobile interaction · Accessibility · Image direction.

---

## 2. Reference matrix

Each row: reference · category · what works · what does **not** fit TMS · reusable principle ·
risk · screens influenced.

| # | Reference | Category | What works | Doesn't fit | Reusable principle | Risk | Influences |
|---|-----------|----------|------------|-------------|--------------------|------|------------|
| 1 | Gagosian | Gallery | Publication-grade editorial rhythm; art fills frame; quiet chrome | Sparse commerce | Chrome recedes, art dominates; hairline rules; editorial journal | Can feel cold without warmth | Home, artwork detail, stories |
| 2 | David Zwirner | Gallery | Restrained type, generous margins, index lists | Minimal transactional UI | Numbered/indexed section rhythm; list-as-navigation | Under-designed if literal | Home, artworks index, collections |
| 3 | Tate | Museum | Bold display type, strong colour blocks per exhibition, AA-solid | Institutional density | Campaign-scoped accent bands inside one system | Colour sprawl | Drops, collections detail |
| 4 | MoMA Store | Museum commerce | Gallery aesthetic applied to real products; clean product cards | Grid can feel flat | Product cards as framed objects on paper | Monotony at scale | Shop, product cards |
| 5 | SSENSE | Fashion commerce | Ruthless information hierarchy; fast filter/scan; typographic restraint | Austere, low-warmth | Dense but calm PLP; sticky filters; minimal cards | Sterile if uncurated | Shop, artworks, filters |
| 6 | Aimé Leon Dore | Streetwear editorial | Lookbook storytelling, warm film imagery, lifestyle → product | Heavy imagery budget | Editorial "scene → shop" scroll; warm neutrals | Slow LCP if unmanaged | Home, stories, drops |
| 7 | KITH | Streetwear drops | Drop calendar, countdown ritual, monospaced meta | Loud at times | Drop as timed event; mono meta type for numerals | Hype-noise | Drops, drop detail, countdown |
| 8 | Cereal Magazine | Editorial | Immense negative space; small type islands; calm luxury | Too quiet for commerce | Negative space as luxury signal; small confident type | Weak CTA affordance | Home, about, stories |
| 9 | Kinfolk | Editorial | Serif/sans pairing, muted palette, slow rhythm | Print-first, low interactivity | Measured line length; editorial captions | Readability at small sizes | Stories, about, artist |
| 10 | Off-White (archive) | Streetwear | Industrial marks, quotation marks, ticker/marquee | Brand-specific gimmicks | Marquee ticker for announcements; industrial captions | Cliché if overused | Home marquee, drop banners |
| 11 | Aesop | Retail | Warm paper, apothecary calm, impeccable spacing, AA text | No art-hero need | Warm-neutral paper; spacing discipline; quiet buttons | Beige monotony | Global palette, buttons |
| 12 | COS | Fashion | Architectural grid, big product imagery, muted | Corporate coolness | Strict modular grid; oversized product media | Feels templated | Shop, product detail |
| 13 | Nike SNKRS | Mobile drops | Best-in-class mobile drop UX; sticky actions; live states | App-scale complexity | Mobile sticky purchase bar; live status chips | Over-engineering | Product mobile, drops mobile |
| 14 | Arc'teryx (Veilance) | Product | Precise spec presentation; muted; premium restraint | Technical tone | Spec tables as quiet editorial; monochrome product | Cold | Product detail, passport |
| 15 | Are.na | Interface | Content-first, near-zero chrome, mono accents | Utilitarian | Content-first; mono UI type for meta | Under-styled | Admin, account |
| 16 | Linear | SaaS/admin | Dense yet calm; superb keyboard UX; subtle depth | Dark-only brand | Operational calm; subtle elevation; fast tables | Not expressive | Admin shell, tables |
| 17 | Vercel Dashboard | Admin | Neutral system, crisp tables, empty states | Generic | Refined table/empty-state system | Anonymous | Admin tables, empty states |
| 18 | Stripe Checkout | Checkout | Calm, trustworthy, single-column focus, clear states | Payment-only scope | Focused single-column checkout; explicit states | — | Checkout, payment states |
| 19 | Shopify Polaris (a11y) | System | Documented a11y patterns; form/validation rigour | Generic look | Accessible form/validation semantics | Blandness | Forms, validation |
| 20 | Radix / React Aria (patterns) | Primitives | Correct listbox/menu/dialog semantics & focus mgmt | Unstyled | ARIA/keyboard contract for custom controls | Effort | Select, combobox, menus |
| 21 | Bravúra / Obys agency sites | Award motion | Purposeful reveal choreography; type-in-motion | Motion-maximalism | Restrained scroll reveal; staggered entrances | Perf/CLS | Home, section reveals |
| 22 | Perfect Diary / Aēsop customiser refs | Configurator | Live-preview product config, staged choices | — | Staged, preview-led configurator | Complexity | Design Studio |
| 23 | Frieze / Art Basel | Gallery/event | Editorial event pages; strong index + filters | Event-only | Filterable index with editorial header | — | Artworks, drops, collections |
| 24 | Present°/Folkform portfolios | Artist portfolio | Confident single-artist voice; big signatures | Non-commerce | Artist voice; signature/mark motif | Ego over UX | About, artist, footer |

Screens/patterns covered: home, artwork index+detail, collections, shop, product detail,
design studio, drops, stories, community, account, cart, checkout, payment states, admin shell,
tables, forms, filters, dropdowns, navigation, footer, motion, mobile, image direction.

---

## 3. Pattern synthesis (recurring high-quality patterns)

- **Chrome recedes, art dominates.** The strongest gallery/artist references keep UI quiet
  (hairlines, small meta type, restrained accent) so artwork carries all colour and energy.
- **Typographic scale *is* the rhythm.** Big confident display headings vs. small uppercase
  eyebrows and mono meta create hierarchy without decoration.
- **Editorial indexing.** Numbered sections (`01 — Gallery`), index lists, and hairline
  dividers make a page feel *composed* like a catalogue rather than *stacked*.
- **Negative space as luxury.** Generous, asymmetric margins and measured line length read as
  premium; dense-but-calm PLPs (SSENSE/COS) prove density and calm can coexist.
- **Scene → shop.** Editorial imagery and storytelling flow directly into purchasable product.
- **Framed objects.** Product/artwork cards read as framed works on paper (hairline frame,
  controlled aspect ratio, quiet meta) rather than shadowed "app cards".
- **Drops as ritual.** Countdown, mono numerals, live status chips — event energy, contained.
- **Operational calm for admin.** Same tokens, less expression: subtle elevation, crisp
  tables, fast keyboard UX, designed empty states (Linear/Vercel).
- **Restrained motion choreography.** Staggered reveals and shared-element continuity, always
  reduced-motion-safe and CLS-safe.
- **Correct primitives.** Custom controls must honour the Radix/React-Aria ARIA + keyboard
  contract; never native-looking selects.

---

## 4. Candidate directions (three, scored)

Scoring 1–5 (5 best) across: Brand distinctiveness (BD), Artwork focus (AF), Commerce
usability (CU), Responsiveness (RE), Accessibility (AC), Technical feasibility (TF),
Performance (PF), Scalability across routes (SC), Content compatibility (CC), Maintainability
(MA).

### Direction A — "The Gallery Press" (editorial art-publication)
Warm-cool gallery paper, near-black ink, one disciplined accent, oversized editorial display
type, numbered section indices, hairline rules, framed art/product objects, dark "focus" bands
for artwork and the Design Studio, restrained reveal motion. Chrome recedes; art is hero.

| BD | AF | CU | RE | AC | TF | PF | SC | CC | MA | **Total** |
|----|----|----|----|----|----|----|----|----|----|-----------|
| 5 | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | **49** |

Builds directly on the existing token architecture (low risk), preserves the liked
Space Grotesk + IBM Plex voice, scales identically to admin as a quieter dialect.

### Direction B — "Ink & Riso" (expressive risograph/comic)
Comic-line motif, riso-style duotone overlays, halftone textures, high-chroma spot colours,
playful marquee. Very distinctive and on-theme for a comic artist.

| BD | AF | CU | RE | AC | TF | PF | SC | CC | MA | **Total** |
|----|----|----|----|----|----|----|----|----|----|-----------|
| 5 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | **32** |

Risk: texture/duotone competes with the artwork (breaks "art is hero"), threatens AA contrast,
harder to keep coherent across admin and long data, heavier to maintain. Best mined for
*accents* (a comic-line divider, a halftone empty-state) rather than a base language.

### Direction C — "Studio Brutalist" (mono-grid, industrial)
Monospace-forward, exposed grid lines, stark black/white, oversized numerals, minimal colour.

| BD | AF | CU | RE | AC | TF | PF | SC | CC | MA | **Total** |
|----|----|----|----|----|----|----|----|----|----|-----------|
| 4 | 3 | 3 | 4 | 3 | 4 | 5 | 4 | 3 | 4 | **37** |

Risk: brutalism can read as cold/austere for a warm artist brand and hurts commerce warmth;
low-contrast stark grids can fail AA and feel harsh on mobile.

---

## 5. Selected direction — **A · "The Gallery Press"** (49/50)

**Why it wins:** It maximises the two non-negotiables (artwork focus + commerce usability)
while being the most technically feasible, performant, scalable and maintainable — because it
*refines* the existing gallery-neutral token system rather than replacing it. It preserves the
already-liked typography and copy, keeps WCAG 2.2 AA intact by tuning (not discarding) the
tuned palette, and gives every route one recognisable language with a quiet admin dialect.
Directions B and C are not discarded wholesale: B contributes a **comic-line divider motif**
and halftone empty-state texture as *sparing accents*; C contributes **monospaced meta/numerals**
for drops and specs. Neither becomes the base.

### What "The Gallery Press" concretely changes
1. **Palette refinement** — warmer, more premium gallery paper; richer ink; a disciplined
   single accent plus the deep-ink primary; a proper elevation + hairline system; art-focus
   dark bands. All values re-verified for AA.
2. **Typography** — larger, tighter editorial display; mono meta face for numerals/specs;
   fluid clamp scale; measured prose width; oldstyle rhythm. Fonts *kept* (justified: they
   already deliver the editorial voice the brief likes) with one addition — a monospace meta
   face (IBM Plex Mono, same family, near-zero cost) for numerals, drop countdowns and specs.
3. **Rhythm** — numbered section indices, hairline dividers, asymmetric editorial grids,
   generous vertical rhythm, full-bleed art bands.
4. **Objects** — framed artwork/product cards (hairline frame, controlled ratio, quiet meta,
   hover reveal) instead of shadow-box app cards.
5. **Motion** — a small token-driven reveal/stagger system, reduced-motion + CLS safe.
6. **Image system** — fixed ratios, focal control, paper matting, hover zoom, skeleton +
   fallback. Art is always framed and never stretched.
7. **Admin dialect** — same tokens, tighter density, subtle elevation, crisp tables, designed
   empty/error states; expressive storefront vs. operational admin, visibly one family.

### Font change record (per brief §2 requirement)
- **Kept:** Space Grotesk (display), IBM Plex Sans (body) — they already deliver the editorial
  voice; no readability regression; zero migration risk.
- **Added:** IBM Plex Mono for meta/numerals/countdowns/spec tables. Justification: same
  superfamily as the body face (visual cohesion, minimal added weight via `next/font`),
  gives drops/passport/spec/admin numerals a precise "studio/press" character that the sans
  cannot, and reinforces the "press" concept. Self-hosted, `display: swap`, subset — no CLS,
  no blocking, negligible bundle impact.

---

## 6. Implementation mapping

Direction A maps to the F6 task tree: UX1 (design-system reconstruction) encodes the palette,
type, spacing, motion and image systems as tokens in `packages/ui`; UX2 lands the flagship
landing page; UX3–UX6 propagate the language across storefront, studio, commerce/account and
admin; UX7 hardens (visual regression, a11y, performance, dropdown audit, production build).
