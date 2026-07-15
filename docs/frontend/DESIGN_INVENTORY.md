# Design Inventory — Base44 Reference Audit

Source: https://taimanicstudiosshop.base44.app/ (audited 2026-07-14 via in-app browser
computed-style extraction at 1280×720).

## Important finding: reference/content mismatch

The live Base44 URL currently renders a **generic minimalist fashion template** branded
"moda.studio" (Autumn/Winter 2025, wool coats, blazers, denim) — **not** the artwork-first
Tai Manic Studios experience described in the master prompt. The template is content-neutral.

**Consequence:** `docs/MASTER_PRODUCT_SPEC.md` and the master prompt are the authoritative
source for _content, structure, and product model_. Base44 is treated strictly as a
_visual-language_ reference — we adopt its strongest typographic and palette qualities and
discard its weaknesses (borderline muted-text contrast, generic layout).

Screenshot capture repeatedly timed out in the automation pane; exact computed design tokens
were extracted instead (recorded below), which is more precise than pixel captures. Re-capture
of PNG breakpoints under `docs/reference/base44/` is tracked as a follow-up (TMS-F0-002).

## Typography

| Role                      | Family                      | Observed                                                                                  |
| ------------------------- | --------------------------- | ----------------------------------------------------------------------------------------- |
| Display / headings        | `Space Grotesk`, sans-serif | h1 24px/32 weight 400, tracking −0.6px; hero h2 96px/96 weight 400; h3 18px/28 weight 500 |
| Body & UI                 | `IBM Plex Sans`, sans-serif | 16px/24 (1.5); labels & nav uppercase 14px tracking 0.7px                                 |
| Overline / eyebrow labels | `IBM Plex Sans`             | uppercase, letter-spacing ~0.7px, 14px                                                    |

Notes: headings use tight negative tracking; nav/labels are uppercase with positive tracking —
a restrained editorial-gallery voice. Both families are Google Fonts and self-hostable.

## Colour palette (observed)

| Token use          | Value            | Hex       |
| ------------------ | ---------------- | --------- |
| Background primary | rgb(249,250,251) | `#F9FAFB` |
| Surface / elevated | rgb(234,237,240) | `#EAEDF0` |
| Text primary (ink) | rgb(26,26,26)    | `#1A1A1A` |
| Heading navy       | rgb(26,32,45)    | `#1A202D` |
| Text muted (slate) | rgb(96,118,133)  | `#607685` |
| Accent deep slate  | rgb(45,62,78)    | `#2D3E4E` |
| Slate tint         | rgb(169,183,193) | `#A9B7C1` |
| On-dark text       | rgb(249,250,251) | `#F9FAFB` |

Palette is cool, low-chroma, gallery-neutral — deliberately recessive so imagery can dominate.

### Contrast weaknesses to fix

- Muted slate `#607685` on `#F9FAFB` ≈ 4.0:1 — **below** the 4.5:1 body-text minimum. Our
  system darkens the muted token to a compliant value (see DESIGN_SYSTEM.md).
- On-dark 70% white over the `#2D3E4E` accent is borderline for small text; we use full-opacity
  on-dark text for body.

## Layout, spacing, structure

- Centred max-width content column with generous vertical rhythm between full-bleed sections.
- Sectioned editorial homepage (hero → seasonal collection → sustainability → essentials →
  about → newsletter → footer), each section a distinct band.
- Uppercase section eyebrows ("SEASONAL COLLECTIONS", "SUSTAINABILITY") above large headings.
- Product tiles: image-forward, name + one-line descriptor, minimal chrome.
- Footer: multi-column (Collections / Information / Legal) with brand blurb and copyright.

## Motion / interaction (observed)

- Restrained; hover state changes on links/tiles; no heavy parallax or autoplay observed.
- Consistent with the master prompt's "subtle, premium transitions" directive.

## Strongest qualities to preserve

1. `Space Grotesk` + `IBM Plex Sans` pairing — distinctive, editorial, not templated.
2. Uppercase letter-spaced eyebrows and nav.
3. Large editorial hero typography.
4. Recessive gallery-neutral palette that lets imagery be the hero.
5. Sectioned editorial rhythm rather than a dense grid.

## Weaknesses to improve (per master prompt §2)

- Sub-AA muted-text contrast → fix in tokens.
- Generic/templated composition → replace with artwork-first, gallery-led layouts.
- No visible dark "gallery" presentation mode → add elevated dark surfaces for artwork focus.
- No evident loading/empty/error states → design deliberate states for every feature.
