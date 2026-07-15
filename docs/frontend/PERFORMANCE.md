# Performance

Targets (master prompt §24): **LCP ≤ 2.5s · INP ≤ 200ms · CLS ≤ 0.1** (field, mobile-first).

## Budgets

- Initial route JS (storefront public pages): ≤ ~130KB gzip shared + minimal per-route.
- Design Studio ships as a **separate bundle**, lazy-loaded — never on catalogue routes.
- Images: responsive `next/image`, modern formats (AVIF/WebP), explicit dimensions, lazy by
  default, `priority` only for the LCP hero image. No original high-res artwork in the browser.
- Fonts: self-hosted via `next/font` with `display: swap`; no external font request; no CLS.

## Practices

- Server components for catalogue/editorial content; client components only where interactive.
- Route-level code splitting; skeletons that reserve final layout to protect CLS.
- Cache API data; avoid client-side waterfalls; colocate data fetching in server code.
- No unnecessary animation dependencies; CSS transitions only in F0.
- Real-user monitoring integration point reserved (Web Vitals reporter hook) — wired in F6.

## Measurement

- Lighthouse CI / `@lhci` budget check added in F6; local `next build` bundle report reviewed
  per phase. F0 records baseline once the first route builds.

## F0 status

Foundation only — no product routes yet. Fonts self-hosted, tokens are CSS variables (zero JS),
primitives are server-renderable. Baseline metrics captured when F1 homepage lands.
