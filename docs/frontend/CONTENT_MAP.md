# Content Map

Maps each UI surface to its content source and the backend contract it will consume. Until
Codex publishes domain endpoints (only `/api/v1/health/*` exists at B0), every surface reads
through a **typed mock adapter** whose types come from `@tms/contracts`. Requests for missing
contracts are logged in `docs/coordination/FRONTEND_TO_BACKEND.md`.

## Data provider strategy

`packages/ui` stays presentational. Each app has a `lib/data` layer exposing a provider
interface with two implementations:

- `mockProvider` — deterministic fixtures typed against `@tms/contracts` (default in F0–F1).
- `apiProvider` — typed client over `/api/v1`, selected by env when the endpoint exists.

Switch via `DATA_SOURCE=mock|api`. Screens on mock are flagged in FRONTEND_HANDOFF until the
real endpoint replaces them.

## Surface → content → contract

| Surface                          | Content                                                               | Backend contract (needed)       | Status                            |
| -------------------------------- | --------------------------------------------------------------------- | ------------------------------- | --------------------------------- |
| Homepage sections                | CMS blocks, featured artwork/collections/drops                        | CMS + catalogue read            | mock (contract not yet published) |
| Artwork gallery/detail           | Artwork + immutable versions, story, editions                         | catalogue read + filters        | mock                              |
| Collections                      | Collection metadata + members                                         | catalogue read                  | mock                              |
| Shop / product                   | Garment variants, colours, sizes, price, stock                        | catalogue + inventory + pricing | mock                              |
| Design Studio                    | Artwork versions, garments, placements, scale presets, preview coords | design config + preview         | mock                              |
| Cart                             | Line items, authoritative totals, reservations                        | cart + pricing                  | mock                              |
| Checkout                         | Address, shipping quotes, payment session, verified result            | checkout + payment + shipping   | mock                              |
| Account/orders/tracking          | Customer, orders, order status timeline                               | auth + orders                   | mock                              |
| Admin dashboard/managers         | Ops metrics, artwork/garment/order/production/errors                  | admin read/write                | mock                              |
| Studio Guide / Brand Storyteller | AI drafts + references                                                | AI endpoints                    | mock                              |

Shared envelope, pagination, and status enums (`OrderStatus`, `PaymentStatus`,
`ShippingStatus`, `DesignConfigurationInput`) are already available in `@tms/contracts` and are
used by the mock adapter now so the swap to `apiProvider` is type-safe.
