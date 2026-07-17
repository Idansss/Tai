# Backend Handoff

## Current backend phase

B5 — Provider integrations has begun. TMS-B4-003 (checkout, guest orders, immutable order snapshots, audited order state machine) is Verified on `codex/b4-checkout-orders` (PR #22, CI green). TMS-B5-001 (PaymentProvider port + complete MockPaymentProvider) is Verified on `codex/b5-payment-provider`, stacked on the B4-003 branch. TMS-B5-002 (Flutterwave adapter behind the same port) is next.

## Work completed

TMS-B5-001 adds payments behind a provider-neutral `PaymentProvider` port (ADR-004/019). `initiate` creates a `payments` row and moves the order AWAITING_PAYMENT → PAYMENT_PROCESSING (idempotent — a reload reuses the pending attempt). The webhook endpoint verifies an HMAC signature over the raw body before parsing, writes every event to the append-only `payment_events` ledger with a unique `(provider, provider_event_id)` so a replay is a no-op, checks amount and currency against the payment, and only then applies the outcome through the order state machine (`OrderService.confirmPayment`/`failPayment` — never a direct status write). `verify` reconciles a lost webhook through the same idempotent path. A hold that expired after a successful charge marks the payment REVERSED and fails the order. Refunds are integer minor units, capped at the refundable balance, and advance the order through REFUND_PENDING. The complete `MockPaymentProvider` decides a deterministic outcome at creation, signs its own webhooks, and reports consistently through webhook and verify. TMS-B4-003 (the prior task on the stacked branch) added checkout, orders, and the state machine itself.

## Tasks verified

TMS-B0-001 through TMS-B0-011, TMS-B1-001 through TMS-B1-003, TMS-B2-001 through TMS-B2-004 (+ B2-004a), TMS-B3-001, TMS-B3-002, TMS-B4-001, TMS-B4-002, TMS-B4-003, and TMS-B5-001.

## Next task

Implement TMS-B5-002: the Flutterwave adapter behind the `PaymentProvider` port — signature/amount/currency/reference verification, idempotent raw events, retries, refunds, and configuration validation. Credentials are absent, so build the full contract, config validation, and contract tests, and mark ONLY live credential verification as Blocked.

## API contracts added or changed

TMS-B5-001 adds four payment operations: `POST /api/v1/orders/{reference}/payment` (initiate), `GET /api/v1/orders/{reference}/payment` (status), `POST /api/v1/orders/{reference}/payment/verify` (reconcile) — all keyed by the order reference so a guest can pay — and `POST /api/v1/payments/webhooks/{provider}` (HMAC-signed, backend-only). They return the existing `OrderPaymentHandoff`; no new shared type or error code. TMS-B4-003 added five checkout/order operations (`GET /checkout/delivery-options`, `POST /checkout/quote`, `POST /orders`, `GET /orders`, `GET /orders/{reference}`) and the `Checkout*`/`Order*`/`Delivery*` contracts. Every OpenAPI `$ref` resolves.

## Database migration

`20260717093000_payments` (TMS-B5-001) adds `payments` and the append-only `payment_events` ledger, plus the `PaymentStatus` enum. Constraints enforce a positive integer amount, a refund never exceeding the amount, an UPDATE/DELETE trigger on `payment_events`, and a unique `(provider, provider_event_id)` for webhook idempotency. TMS-B4-003's `20260717090000_orders_checkout` added `orders`, `order_items`, and `order_events`. These are the eleventh and twelfth migrations, so the persistence guard now asserts 12.

## Environment variables added

`PAYMENT_PROVIDER` (default `mock`, rejected as `mock` in production) and `MOCK_PAYMENT_WEBHOOK_SECRET` (default local; replace per deployment). Both are annotated in `.env.example`. `main.ts` now creates the app with `rawBody: true` so webhook signatures verify against the exact bytes.

## Files changed

Only backend-owned code and tests: `apps/api/src/payments` and `apps/api/src/orders`, `packages/database` schema/migrations/exports and the migration-count guard, `packages/configuration` (payment env + guard), `packages/contracts`, `docs/contracts/openapi.yaml`, `.env.example`, `apps/api/src/main.ts` (rawBody), and backend/coordination/decision documentation. `apps/api/src/app.module.ts` registers `OrderModule` and `PaymentModule`. No frontend-owned implementation, frontend documentation, UI package, or frontend state file was modified. `package.json`/`pnpm-lock.yaml` are untouched — no dependency was added.

## Commands and results

`pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm db:validate` pass. TMS-B5-001 adds 8 real-PostgreSQL payment HTTP scenarios plus a MockPaymentProvider unit spec; TMS-B4-003 added 12 checkout/order scenarios plus a delivery/VAT/state-machine unit spec. The database persistence suite (8 tests) deploys all 12 migrations and asserts the count. `pnpm audit` is broken locally (retired npm endpoint), so CI remains the sole source of truth for the security gate.

## Known defects and deferred scope

The payment gateway is the mock; TMS-B5-002 wires Flutterwave behind the same port and refunds a REVERSED charge on a real gateway (live verification credential-blocked). The administrator refund endpoint and a payments RBAC permission land with the B6 operations surface; refund is a service operation now. Delivery fees and VAT are a fixed server catalogue; TMS-B5-003 replaces them with live shipping rates. The production/dispatch/returns transitions are declared in `ORDER_TRANSITIONS` but exercised by later B6 tasks. Readiness reports process readiness only; authentication throttling is process-local (move to Redis before horizontal scaling); MFA encryption needs multi-key rotation before changing the production key.

## Blockers

No TMS-B5-001 blocker. Live Flutterwave verification (TMS-B5-002) and GIGL verification (TMS-B5-003) remain credential-blocked.

## Requests for Claude Code

Continue to own the frontend directories in `AGENTS.md`. Consume the checkout/orders and payment contracts only after both PRs merge (see the 2026-07-17 notes in `BACKEND_TO_FRONTEND.md`). Render server totals and the order snapshot rather than recomputing. Drive the pay/processing/success/failure screens off `POST/GET /orders/{reference}/payment`; poll `GET .../payment` or call `.../payment/verify` for status, and never trust a client `?outcome=` param. The gateway is a mock until TMS-B5-002, but the flow and states are real.

## Do not redo

Do not recreate B0/B1 foundations, authentication/RBAC, artwork/catalogue, garments/compatibility, media, designs, pricing/availability, inventory/reservations, carts/promotions, the checkout/orders schema and state machine, or the PaymentProvider port and mock gateway in later slices.

## Exact continuation instruction

Merge the TMS-B4-003 PR (`codex/b4-checkout-orders`, PR #22) then the TMS-B5-001 PR (`codex/b5-payment-provider`, stacked on it). Then continue TMS-B5-002 (Flutterwave adapter behind the `PaymentProvider` port) on a fresh backend branch from the latest `main`, building the full contract, config validation, and contract tests and marking only live credential verification as Blocked, without modifying frontend-owned files.
