# Backend to Frontend

# Frontend Foundation Ready

## Status

Stage B0 has been merged into `main`.

## Claude Code starting branch

Create the branch from the latest `main`:

```bash
git checkout main
git pull --ff-only origin main
git checkout -b claude/f0-visual-foundation
```

## Frontend-owned directories

- apps/storefront/
- apps/admin/
- packages/ui/
- docs/frontend/
- docs/progress/FRONTEND_TODO.md
- docs/handoffs/FRONTEND_HANDOFF.md
- .ai/frontend-state.json

## Shared contracts available

- API success and error envelopes
- Pagination contracts
- Order status values
- Payment status values
- Shipping status values
- Design Studio configuration input
- Liveness response
- Readiness response

## Available backend endpoints

- GET /api/v1/health/live
- GET /api/v1/health/ready
- Swagger UI: /api/docs
- OpenAPI JSON: /api/docs/openapi.json

## Important limitation

Domain APIs, authentication, catalogue, cart, checkout, payment and shipping APIs are not implemented yet. Claude Code should use typed mock adapters matching `packages/contracts` and replace them as backend endpoints become available.

## 2026-07-14 — B0 baseline

- Added the initial API envelope, public error codes, pagination query, order/payment/shipping statuses, and Design Studio configuration input in `packages/contracts`.
- Added liveness and readiness endpoints under `/api/v1/health`.
- Added the OpenAPI baseline at `docs/contracts/openapi.yaml`.
- Compatibility: additive; no previous contract existed.
- Frontend action: create `claude/f0-visual-foundation` from the latest `main` and use typed mock adapters for unimplemented domain APIs.
