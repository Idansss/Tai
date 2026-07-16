# API Contract

OpenAPI at `docs/contracts/openapi.yaml` is the source of truth. Runtime Swagger is exposed at `/api/docs`; generated-client automation is added once the first domain endpoints exist.

All endpoints are versioned under `/api/v1`. Successful responses use `{ data, meta: { correlationId } }`. Errors use `{ error: { code, message, correlationId, details? } }`. Public error codes and status enums live in `packages/contracts`.

Contract changes require OpenAPI, shared types, tests, migration notes where relevant, and an entry in `docs/coordination/BACKEND_TO_FRONTEND.md`. Breaking changes must be labelled and preferably released under a new API version.

TMS-B1-002 adds customer authentication under `/api/v1/auth`: registration, login/logout, verification request/confirm, password-reset request/confirm, current session, owned session revocation, and revoke-all. Authentication is an opaque HttpOnly cookie named `tms_session`; browser code never reads or submits the token directly. Recovery-request responses deliberately do not reveal whether an email exists.
