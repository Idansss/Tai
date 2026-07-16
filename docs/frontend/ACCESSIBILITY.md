# Accessibility — WCAG 2.2 Level AA

Accessibility is mandatory and is a completion gate for every task (master prompt §8, §31).

## Requirements checklist

- [ ] Contrast: ≥4.5:1 normal text, ≥3:1 qualifying large text, ≥3:1 UI boundaries/states.
- [ ] Visible keyboard focus (token `--color-focus-ring`, `:focus-visible`, never removed).
- [ ] Logical tab order; no positive `tabindex`.
- [ ] Semantic headings (one `h1`/page, no skipped levels).
- [ ] Landmarks: `header`/`nav`/`main`/`footer`, labelled where repeated.
- [ ] All form controls have programmatic labels; errors associated via `aria-describedby`.
- [ ] Screen-reader status messages via polite live regions (`VisuallyHidden` / `role=status`).
- [ ] Reduced motion honoured (`prefers-reduced-motion: reduce` disables transitions).
- [ ] Mobile pinch-zoom allowed (no `maximum-scale`/`user-scalable=no`).
- [ ] Meaningful `alt` text; decorative images `alt=""`.
- [ ] Colour never the sole status indicator (pair with icon/text/shape).
- [ ] Accessible colour swatches and size selectors (name + state announced).
- [ ] Modals/drawers trap & restore focus; `Esc` closes; background inert.
- [ ] Loading states do not trap assistive technology.
- [ ] Target size ≥24×24px (WCAG 2.2 2.5.8).

## Tooling & gate of record

- Component tests assert axe-core has zero violations on rendered primitives.
- A token-contrast unit test computes WCAG ratios for every foreground/background token pair
  and fails on any AA miss (TMS-F0-009).
- Playwright e2e runs `@axe-core/playwright` on key routes (added as routes land).
- Manual keyboard + screen-reader pass recorded per phase in FRONTEND_HANDOFF.

## F0 baseline status — passing

Foundation primitives ship with focus-visible rings, reduced-motion handling, `VisuallyHidden`
utility, a skip-to-content link, and labelled icon-only controls. The token-contrast test
(light + dark) and axe assertions on primitives pass (35 tests green). Route-level axe sweeps
begin in F1 as pages are built.
