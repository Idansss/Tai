# Visual Regression

Tooling: Playwright (`@playwright/test`) screenshot assertions. Baselines are committed and
reviewed manually. **Never** update snapshots merely to make a test pass — document every
intentional visual change here with the reason and the task ID.

## Breakpoints

Capture at: 360, 390, 430 (mobile) · 768 (tablet) · 1024, 1280, 1440 (desktop). Both
`light` and `dark` gallery themes where the surface differs.

## Baseline targets (master prompt §28)

homepage · artwork gallery · artwork detail · collection · shop · product · Design Studio ·
cart · checkout · customer account · admin dashboard · artwork manager · order detail ·
production queue.

## Determinism rules

- Freeze animations / disable motion in the test project.
- Use mock data adapter with fixed fixtures so pixels are stable.
- Mask volatile regions (timestamps, correlation IDs).

## Change log

| Date | Task | Baseline(s) changed | Reason                                                  |
| ---- | ---- | ------------------- | ------------------------------------------------------- |
| —    | —    | —                   | Playwright config + first baselines land with F1 routes |

## F0 status

Playwright config and a smoke visual test for the design-system showcase page are scaffolded in
F0. Full route baselines are captured as routes are built (F1+).
