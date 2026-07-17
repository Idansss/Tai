# Backend Handoff

## Current backend phase

B4 — Commerce core is active. TMS-B4-001 (inventory + reservations) and TMS-B4-002 (carts + promotions) are Verified. TMS-B4-003 (checkout, guest orders, immutable order snapshots, audited order state machine) is Verified on `codex/b4-checkout-orders` with its PR open. TMS-B5-001 (PaymentProvider + MockPaymentProvider) is next.

## Work completed

TMS-B4-003 adds checkout and orders on top of the cart (TMS-B4-002) and inventory (TMS-B4-001). Placing an order refuses an empty or issue-carrying cart before anything else (ADR-017 — fail at the cart, never at the card), takes the ADR-016 inventory hold per line at a fifteen-minute TTL, snapshots every line with copied price, currency, and descriptive fields (ADR-015/018 — a later catalogue or price change never rewrites a placed order), then writes the immutable order and empties the cart in one transaction. The order begins AWAITING_PAYMENT.

Order status only ever changes through one `ORDER_TRANSITIONS` map; `OrderService` refuses any move the map forbids, guards each update on the expected current status, and appends an `order_events` row that a trigger makes append-only. `confirmPayment` commits every hold and moves to PAID; `failPayment` releases them; a hold that expired underneath a checkout blocks confirmation before the order is marked paid. Delivery fees and Nigerian VAT (7.5% on the discounted goods subtotal) are server-authoritative integer arithmetic from a fixed catalogue. Idempotency is a per-customer key; a guest resubmission is caught by the emptied cart. Guest orders reconcile onto an account by verified contact email.

## Tasks verified

TMS-B0-001 through TMS-B0-011, TMS-B1-001 through TMS-B1-003, TMS-B2-001 through TMS-B2-004 (+ B2-004a), TMS-B3-001, TMS-B3-002, TMS-B4-001, TMS-B4-002, and TMS-B4-003.

## Next task

Implement TMS-B5-001: the `PaymentProvider` contract and a complete `MockPaymentProvider` — end-to-end mock checkout, verification, signed webhook simulation, refunds, duplicate/replay handling, and reconciliation. It drives the order state machine through `OrderService.beginPayment`/`confirmPayment`/`failPayment` and populates the order's payment handoff.

## API contracts added or changed

Five operations: `GET /api/v1/checkout/delivery-options`, `POST /api/v1/checkout/quote`, `POST /api/v1/orders`, `GET /api/v1/orders`, and `GET /api/v1/orders/{reference}`. Checkout and order placement are guest-friendly (the `tms_cart` cookie); order reads require the `tms_session` cookie. The shared contract adds `CheckoutAddressInput`, `CheckoutContactInput`, `CheckoutQuoteInput`, `PlaceOrderInput`, `DeliveryMethod`/`DeliveryOption`, `CheckoutQuote`, `Order`, `OrderItem`, `OrderSummary`, `OrderTimelineEntry`, and `OrderPaymentHandoff`. No new error code was needed (`CONFLICT`, `INVENTORY_UNAVAILABLE`, `VALIDATION_FAILED`, `RESOURCE_NOT_FOUND`, `SESSION_INVALID` cover it). Every OpenAPI `$ref` resolves.

## Database migration

`20260717090000_orders_checkout` adds `orders`, `order_items`, and the append-only `order_events` ledger, plus the `OrderStatus` and `DeliveryMethod` enums. Constraints enforce integer non-negative money, `total = subtotal - discount + delivery + tax`, `discount <= subtotal`, a positive subtotal (no empty order can be written), the copied line total, per-customer idempotency uniqueness, and an UPDATE/DELETE trigger on `order_events`. Snapshot columns are copied; the tuple foreign keys are RESTRICT for traceability. This is the eleventh migration, so the persistence guard now asserts 11.

## Environment variables added

None.

## Files changed

Only backend-owned code and tests: `apps/api/src/orders`, `packages/database` schema/migration/exports and the migration-count guard, `packages/contracts`, `docs/contracts/openapi.yaml`, and backend/coordination/decision documentation, TODO/traceability/handoff/state ledgers. No frontend-owned implementation, frontend documentation, UI package, or frontend state file was modified. `apps/api/src/app.module.ts` registers the new `OrderModule`.

## Commands and results

`pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm db:validate` pass. The orders slice adds 12 real-PostgreSQL HTTP scenarios plus a delivery/VAT/state-machine unit spec; the database persistence suite (8 tests) deploys all 11 migrations and verifies the migration count. `pnpm audit` is broken locally (retired npm endpoint), so CI remains the sole source of truth for the security gate.

## Known defects and deferred scope

Order `payment` is a status-only stub (provider/reference/redirect null) until TMS-B5-001 adds the real handoff and webhooks. Reading a guest order back by reference needs the payment return token TMS-B5-001 adds. Delivery fees and VAT are a fixed server catalogue; TMS-B5-003 replaces them with live shipping rates. The production/dispatch/returns transitions are declared in `ORDER_TRANSITIONS` but exercised by later B6 operations tasks. Readiness reports process readiness only; authentication throttling is process-local (move to Redis before horizontal scaling); MFA encryption needs multi-key rotation before changing the production key.

## Blockers

No B4-003 blocker. Live Flutterwave and GIGL verification remains credential-blocked later in B5.

## Requests for Claude Code

Continue to own the frontend directories in `AGENTS.md`. Consume the checkout/orders contract only after this PR merges (see the 2026-07-17 note in `BACKEND_TO_FRONTEND.md`). Render server totals and the order snapshot rather than recomputing delivery/VAT or reading live catalogue for a placed order. Treat a checkout `409 CONFLICT` as "resolve the cart first". Keep `lib/payment.ts` on the mock resolver until TMS-B5-001 lands the real payment intent and webhook-backed status; never trust a client `?outcome=` param.

## Do not redo

Do not recreate B0/B1 foundations, authentication/RBAC, artwork/catalogue, garments/compatibility, media, designs, pricing/availability, inventory/reservations, carts/promotions, or the checkout/orders schema and state machine in later slices.

## Exact continuation instruction

Merge the TMS-B4-003 PR from `codex/b4-checkout-orders`, then continue TMS-B5-001 on a fresh backend branch from the latest `main`, driving the order state machine through `OrderService` and populating the order payment handoff, without modifying frontend-owned files.
