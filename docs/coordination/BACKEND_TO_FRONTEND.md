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

## 2026-07-14 — TMS-B1-001 identity persistence

- Added backend-only persistence for users, profiles, sessions, verification/reset tokens, RBAC, and immutable audit records.
- Compatibility: no public endpoint, OpenAPI, or `packages/contracts` change.
- Frontend action: none. Continue using typed mock authentication adapters until TMS-B1-002 publishes the authentication contract.

## 2026-07-16 — TMS-B1-002 customer authentication

- Status: implemented on `codex/b1-authentication`; consume after its focused PR is merged.
- Compatibility: additive. Existing health and shared baseline contracts are unchanged.
- Authentication transport: opaque `tms_session` HttpOnly cookie. Browser code must use credentialed same-origin requests and must not attempt to read or persist the token.
- Added endpoints:
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/logout`
  - `POST /api/v1/auth/email-verification/request`
  - `POST /api/v1/auth/email-verification/confirm`
  - `POST /api/v1/auth/password-reset/request`
  - `POST /api/v1/auth/password-reset/confirm`
  - `GET /api/v1/auth/session`
  - `DELETE /api/v1/auth/sessions/:sessionId`
  - `DELETE /api/v1/auth/sessions`
- Registration requires `email`, a 12–128 character `password`, and optional `displayName`. It returns the customer plus `verificationRequired: true`.
- Login and verification confirmation return `{ data: { session }, meta }` and set the cookie. Logout and session deletion return `204`.
- Verification/reset request endpoints always return `{ data: { accepted: true }, meta }` for known and unknown email addresses.
- Added public error codes: `AUTHENTICATION_INVALID`, `EMAIL_VERIFICATION_REQUIRED`, `TOKEN_INVALID_OR_EXPIRED`, and `SESSION_INVALID`.
- Frontend action: replace typed mock customer authentication when the PR merges; add `/account/verify-email` and `/account/reset-password` handlers that read the one-time `token` query parameter and submit it to the corresponding confirm endpoint. Do not expose different recovery UI for known vs unknown email addresses.
