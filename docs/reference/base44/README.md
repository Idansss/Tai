# Base44 reference — breakpoint screenshots

Source: <https://taimanicstudiosshop.base44.app/> · captured 2026-07-15 with Playwright/Chromium.

| Breakpoint   | Viewport | File                         |
| ------------ | -------- | ---------------------------- |
| Desktop (lg) | 1440×900 | `reference-desktop-1440.png` |
| Desktop      | 1280×800 | `reference-desktop-1280.png` |
| Tablet       | 768×1024 | `reference-tablet-768.png`   |
| Mobile       | 390×844  | `reference-mobile-390.png`   |

## ⚠️ Content mismatch — read before using these

These are honest, full-page captures of what the Base44 URL **actually serves today**: a generic
minimalist fashion template branded **"moda.studio"** ("Contemporary fashion with purpose",
Winter 2025 / Spring–Summer 2025, wool coats and blazers) — **not** the artwork-first Tai Manic
Studios experience described in the master prompt. This is the same mismatch recorded in
`docs/frontend/DESIGN_INVENTORY.md`.

They are kept only as a dated visual record of the reference's state. **They are not a design
target.** The authoritative sources are:

- **Content, structure, product model** → `docs/agents/CLAUDE_FRONTEND_MASTER_PROMPT.md` +
  `docs/MASTER_PRODUCT_SPEC.md`.
- **Design tokens / colour / type** → the computed values already extracted into
  `docs/frontend/DESIGN_INVENTORY.md` and implemented in `packages/ui`.

To refresh these captures, re-run the capture against the URL above at the four viewports listed.
