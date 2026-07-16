# Tai Manic Studios — Design System

Owner: Claude Code · Location: `packages/ui` · Consumers: `apps/storefront`, `apps/admin`.

## 1. Design direction — "Gallery + Studio"

An art-led, gallery-neutral system where the artwork is always the hero. Chrome is quiet and
recessive; type is editorial; imagery and colour come from the art itself. Two surface modes:

- **Light gallery** (default) — warm paper neutrals, ink text. For catalogue, editorial, admin.
- **Dark gallery** — deep charcoal surfaces for artwork-focus bands and the Design Studio, so
  colourful art reads with maximum contrast.

This preserves Base44's strongest qualities (Space Grotesk + IBM Plex Sans, uppercase
letter-spaced eyebrows, large editorial hero type, recessive palette) and fixes its
weaknesses (sub-AA muted text, generic templated composition, no deliberate states).

## 2. Stack decisions

| Concern                 | Choice                                                      | Reason                                                                           |
| ----------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Framework               | Next.js App Router + React                                  | Master prompt §6; server components for catalogue, client only where interactive |
| Language                | TypeScript strict (pinned 6.0.x per ADR-005)                | Repo toolchain                                                                   |
| Styling                 | **Tailwind CSS v4**, CSS-first `@theme`, single system      | Prompt forbids competing styling systems                                         |
| Variants                | `class-variance-authority` + `tailwind-merge` (`cn`)        | Typed, composable component variants                                             |
| Fonts                   | `next/font` self-hosting Space Grotesk + IBM Plex Sans      | Performance, no external request, no CLS                                         |
| Icons                   | `lucide-react`                                              | Accessible, tree-shakeable, no heavy dependency                                  |
| Component tests         | Vitest + Testing Library + jsdom                            | Repo already pins Vitest 4                                                       |
| A11y checks             | `axe-core` / `jest-axe`-style assertions in component tests | WCAG 2.2 AA gate                                                                 |
| E2E + visual regression | Playwright (`@playwright/test`)                             | Prompt §27–28                                                                    |

No large animation library in F0; motion uses CSS + small, purposeful transitions (prompt §22).

## 3. Semantic design tokens

Tokens are CSS custom properties (the exact names required by master prompt §7), defined on
`:root` (light) and overridden on `[data-theme="dark"]`, then exposed to Tailwind via
`@theme inline`. Components never hard-code hex — they reference token utilities.

### Light gallery (`:root`)

| Token                          | Value     | Notes                                             |
| ------------------------------ | --------- | ------------------------------------------------- |
| `--color-background-primary`   | `#FAFAF7` | warm paper                                        |
| `--color-background-secondary` | `#F1F1EC` |                                                   |
| `--color-background-elevated`  | `#FFFFFF` |                                                   |
| `--color-surface-primary`      | `#FFFFFF` |                                                   |
| `--color-surface-secondary`    | `#F1F1EC` |                                                   |
| `--color-text-primary`         | `#17171A` | ink, ~15:1 on paper                               |
| `--color-text-secondary`       | `#3D4450` | ~9:1                                              |
| `--color-text-muted`           | `#565E6B` | darkened from Base44 `#607685` for AA (~5.8:1)    |
| `--color-border-default`       | `#E4E4DD` |                                                   |
| `--color-border-strong`        | `#C7C7BC` |                                                   |
| `--color-accent-primary`       | `#2D3E4E` | deep slate (from Base44); white-on ~10:1          |
| `--color-accent-secondary`     | `#A2461F` | burnt sienna / studio-ink warmth; white-on ~4.7:1 |
| `--color-success`              | `#2E7D57` | AA on white                                       |
| `--color-warning`              | `#8A5A00` | AA on white                                       |
| `--color-error`                | `#B3261E` | AA on white                                       |
| `--color-information`          | `#2D5AA0` | AA on white                                       |
| `--color-focus-ring`           | `#3B6FD4` | high-visibility, ≥3:1 vs adjacent                 |
| `--color-disabled-background`  | `#E8E8E2` |                                                   |
| `--color-disabled-text`        | `#8C8C82` | disabled text exempt from minima                  |

### Dark gallery (`[data-theme="dark"]`)

background-primary `#121316` · background-secondary `#1A1C20` · background-elevated `#22252B` ·
surface-primary `#1A1C20` · surface-secondary `#22252B` · text-primary `#F4F4F0` ·
text-secondary `#C4C7CE` · text-muted `#9AA0AB` (≥4.5 on bg) · border-default `#2E3238` ·
border-strong `#474C55` · accent-primary `#A9C4DC` · accent-secondary `#E08A5F` ·
status colours lightened for dark contrast · focus-ring `#6FA0FF`.

> All contrast ratios are targets; an automated token-contrast test plus axe checks
> (TMS-F0-009) is the gate of record. Any token that fails is corrected, not waived.

## 4. Type scale

Families: `--font-display: "Space Grotesk"`, `--font-sans: "IBM Plex Sans"`.

| Step        | Size / line-height                        | Use                   |
| ----------- | ----------------------------------------- | --------------------- |
| display-2xl | clamp 3rem–6rem / 1.02, tracking −0.02em  | hero                  |
| display-xl  | 3rem / 1.05                               | section hero          |
| display-lg  | 2.25rem / 1.1                             | page titles           |
| heading-lg  | 1.5rem / 1.25                             | card/section headings |
| heading-md  | 1.125rem / 1.4, weight 500                | sub-headings          |
| body-lg     | 1.125rem / 1.6                            | lead paragraphs       |
| body        | 1rem / 1.6                                | default               |
| body-sm     | 0.875rem / 1.5                            | secondary             |
| eyebrow     | 0.8125rem / 1, uppercase, tracking 0.08em | section labels, nav   |
| caption     | 0.75rem / 1.4                             | metadata              |

## 5. Spacing, radius, elevation, motion

- **Spacing** — 4px base scale: 0,1(4),2(8),3(12),4(16),5(20),6(24),8(32),10(40),12(48),16(64),
  20(80),24(96) mapped to Tailwind spacing.
- **Radius** — `sm 4px`, `md 8px`, `lg 12px`, `xl 20px`, `pill 999px`. Cards use `lg`.
- **Elevation** — flat by default; `shadow-sm` for elevated surfaces, `shadow-md` for
  overlays/modals; dark mode uses border + subtle glow instead of heavy shadow.
- **Layout widths** — content `max-w-[72rem]`, prose `max-w-[42rem]`, full-bleed hero.
- **Motion** — durations `fast 120ms`, `base 200ms`, `slow 320ms`; easing
  `cubic-bezier(0.2,0.8,0.2,1)`. All transitions wrapped by
  `@media (prefers-reduced-motion: reduce)` → none. Image ratios: artwork `4:5`, product `3:4`,
  collection `16:9`, avatar `1:1`.

## 6. Component states (mandatory for every interactive component)

Default · Hover · Focus-visible (visible ring via `--color-focus-ring`) · Active · Selected ·
Disabled · Loading · Error · Success. Colour is never the sole status signal — pair with icon,
text, or shape.

## 7. Component library plan (`packages/ui`)

**Built in F0 (foundation set):** `cn` util, tokens/globals, Button, IconButton, Link, Badge,
Card, Price, Skeleton, Spinner, Alert, EmptyState, ErrorState, VisuallyHidden, plus type &
layout primitives (Container, Stack, Eyebrow, Heading, Text). These prove the token system and
unblock F1.

**Later phases (F1–F5):** Input, Textarea, Select, Combobox, Checkbox, Radio, Switch, FormField,
ValidationMessage, Modal, Drawer, Dropdown, Tabs, Accordion, Tooltip, Toast, ArtworkCard,
ProductCard, CollectionCard, QuantityControl, Breadcrumb, Pagination, DataTable,
ConfirmationDialog, FileUploader, ImageGallery, ColourSwatch, SizeSelector, StatusTimeline,
FilterPanel, SearchField, MediaViewer. Tracked in FRONTEND_TODO.

Native `<select>` is avoided where it visually conflicts, but every custom control keeps full
keyboard + screen-reader semantics (master prompt §7).
