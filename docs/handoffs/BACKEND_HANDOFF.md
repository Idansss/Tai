# Backend Handoff

## Current backend phase

B5 — Provider integrations. TMS-B4-003 (checkout/orders/state machine) is Verified on `codex/b4-checkout-orders` (PR #22, CI green). TMS-B5-001 (PaymentProvider port + MockPaymentProvider) is Verified on `codex/b5-payment-provider` (PR #24, CI green), stacked on B4-003. TMS-B5-002 (Flutterwave adapter) is Verified on `codex/b5-flutterwave`, stacked on B5-001, with live credential verification Blocked. TMS-B5-003 (ShippingProvider + GIGL) is next.

## Work completed

TMS-B5-002 adds the Flutterwave adapter behind the provider-neutral port (ADR-019) with no change to `PaymentService`, the webhook endpoint, or the order state machine — it drops in behind the same interface. The adapter takes an injectable `fetch` so it is fully testable without a network. It authenticates webhooks by Flutterwave's `verif-hash` scheme (constant-time compare against the configured hash), uses a generated `tx_ref` as the provider reference, resolves the numeric transaction id via `verify_by_reference` for verification and refunds, and is the single place that converts between the platform's integer minor units (kobo) and Flutterwave's major units (naira). The module factory selects the gateway by `PAYMENT_PROVIDER`. TMS-B5-001 (prior on the stack) added the port, `PaymentService`, the `payments`/`payment_events` schema, and the complete `MockPaymentProvider`; TMS-B4-003 added checkout, orders, and the state machine.

## Tasks verified

TMS-B0-001 through TMS-B0-011, TMS-B1-001 through TMS-B1-003, TMS-B2-001 through TMS-B2-004 (+ B2-004a), TMS-B3-001, TMS-B3-002, TMS-B4-001, TMS-B4-002, TMS-B4-003, TMS-B5-001, and TMS-B5-002 (live credential verification Blocked).

## Next task

Implement TMS-B5-003: the `ShippingProvider` contract, a mock shipping provider, and the GIGL adapter architecture — rates, bookings, pickup, tracking, events, returns, retry/reconciliation, fallback, health, and contract tests. Mirror the payment-provider pattern (provider-neutral port, injectable HTTP, config-selected gateway). Live GIGL verification stays Blocked until credentials are supplied.

## API contracts added or changed

TMS-B5-002 adds no new operation, contract, or error code — the Flutterwave adapter reuses the TMS-B5-001 payment endpoints and handoff shape. TMS-B5-001 adds four payment operations: `POST /api/v1/orders/{reference}/payment` (initiate), `GET /api/v1/orders/{reference}/payment` (status), `POST /api/v1/orders/{reference}/payment/verify` (reconcile) — all keyed by the order reference so a guest can pay — and `POST /api/v1/payments/webhooks/{provider}` (HMAC-signed, backend-only). They return the existing `OrderPaymentHandoff`; no new shared type or error code. TMS-B4-003 added five checkout/order operations (`GET /checkout/delivery-options`, `POST /checkout/quote`, `POST /orders`, `GET /orders`, `GET /orders/{reference}`) and the `Checkout*`/`Order*`/`Delivery*` contracts. Every OpenAPI `$ref` resolves.

## Database migration

TMS-B5-002 adds no migration (the Flutterwave adapter reuses the `payments`/`payment_events` tables). `20260717093000_payments` (TMS-B5-001) adds `payments` and the append-only `payment_events` ledger, plus the `PaymentStatus` enum. Constraints enforce a positive integer amount, a refund never exceeding the amount, an UPDATE/DELETE trigger on `payment_events`, and a unique `(provider, provider_event_id)` for webhook idempotency. TMS-B4-003's `20260717090000_orders_checkout` added `orders`, `order_items`, and `order_events`. These are the eleventh and twelfth migrations, so the persistence guard now asserts 12.

## Environment variables added

TMS-B5-002 adds `FLUTTERWAVE_BASE_URL` (default the live v3 API), `FLUTTERWAVE_SECRET_KEY`, and `FLUTTERWAVE_WEBHOOK_HASH` — the last two required whenever `PAYMENT_PROVIDER=flutterwave` — and extends `PAYMENT_PROVIDER` to `mock|flutterwave`. TMS-B5-001 added `PAYMENT_PROVIDER` (mock rejected in production) and `MOCK_PAYMENT_WEBHOOK_SECRET`, and set `rawBody: true` in `main.ts`. All are annotated in `.env.example`.

## Files changed

TMS-B5-002 changes only `apps/api/src/payments` (the Flutterwave adapter, its contract spec, and the module factory), `packages/configuration` (Flutterwave env + guard and its spec), and `.env.example`, plus backend documentation. No migration, no new dependency; `package.json`/`pnpm-lock.yaml` untouched. No frontend-owned file was modified. (TMS-B5-001 additionally touched `packages/database`, `packages/contracts`, `docs/contracts/openapi.yaml`, `apps/api/src/main.ts`, and `app.module.ts`.)

## Commands and results

`pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm db:validate` pass. TMS-B5-002 adds 7 Flutterwave contract tests (fake `fetch`, no network) and Flutterwave config-validation tests; the payment suite is now 3 files / 20 tests. TMS-B5-001 added 8 real-PostgreSQL payment scenarios; TMS-B4-003 added 12 checkout/order scenarios. The database persistence suite (8 tests) deploys all 12 migrations and asserts the count. `pnpm audit` is broken locally (retired npm endpoint), so CI remains the sole source of truth for the security gate.

## Known defects and deferred scope

The payment gateway is the mock; TMS-B5-002 wires Flutterwave behind the same port and refunds a REVERSED charge on a real gateway (live verification credential-blocked). The administrator refund endpoint and a payments RBAC permission land with the B6 operations surface; refund is a service operation now. Delivery fees and VAT are a fixed server catalogue; TMS-B5-003 replaces them with live shipping rates. The production/dispatch/returns transitions are declared in `ORDER_TRANSITIONS` but exercised by later B6 tasks. Readiness reports process readiness only; authentication throttling is process-local (move to Redis before horizontal scaling); MFA encryption needs multi-key rotation before changing the production key.

## Blockers

TMS-B5-002 live Flutterwave verification is Blocked: no sandbox keys are present, so create/verify/refund are proven against a fake `fetch`. Supply `FLUTTERWAVE_SECRET_KEY`/`FLUTTERWAVE_WEBHOOK_HASH` and run one sandbox transaction to close it. GIGL verification (TMS-B5-003) remains credential-blocked.

## Requests for Claude Code

Continue to own the frontend directories in `AGENTS.md`. Consume the checkout/orders and payment contracts only after both PRs merge (see the 2026-07-17 notes in `BACKEND_TO_FRONTEND.md`). Render server totals and the order snapshot rather than recomputing. Drive the pay/processing/success/failure screens off `POST/GET /orders/{reference}/payment`; poll `GET .../payment` or call `.../payment/verify` for status, and never trust a client `?outcome=` param. The gateway is a mock until TMS-B5-002, but the flow and states are real.

## Do not redo

Do not recreate B0/B1 foundations, authentication/RBAC, artwork/catalogue, garments/compatibility, media, designs, pricing/availability, inventory/reservations, carts/promotions, the checkout/orders schema and state machine, the PaymentProvider port and mock gateway, or the Flutterwave adapter in later slices.

## Exact continuation instruction

Merge the stack in order: TMS-B4-003 (`codex/b4-checkout-orders`, PR #22) → TMS-B5-001 (`codex/b5-payment-provider`, PR #24) → TMS-B5-002 (`codex/b5-flutterwave`). Then continue TMS-B5-003 (ShippingProvider contract, mock shipping, GIGL adapter) on a fresh backend branch from the latest `main`, mirroring the payment-provider pattern, marking only live GIGL verification as Blocked, without modifying frontend-owned files.
