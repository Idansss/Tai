# API Contract

OpenAPI at `docs/contracts/openapi.yaml` is the source of truth. Runtime Swagger is exposed at `/api/docs`; generated-client automation is added once the first domain endpoints exist.

All endpoints are versioned under `/api/v1`. Successful responses use `{ data, meta: { correlationId } }`. Errors use `{ error: { code, message, correlationId, details? } }`. Public error codes and status enums live in `packages/contracts`.

Contract changes require OpenAPI, shared types, tests, migration notes where relevant, and an entry in `docs/coordination/BACKEND_TO_FRONTEND.md`. Breaking changes must be labelled and preferably released under a new API version.

TMS-B1-002 adds customer authentication under `/api/v1/auth`: registration, login/logout, verification request/confirm, password-reset request/confirm, current session, owned session revocation, and revoke-all. Authentication is an opaque HttpOnly cookie named `tms_session`; browser code never reads or submits the token directly. Recovery-request responses deliberately do not reveal whether an email exists.

TMS-B1-003 adds staff authentication under `/api/v1/admin/auth` and access control under `/api/v1/admin/access`. Administration uses a separate opaque `tms_admin_session` cookie and never accepts a customer-audience session. Login returns either a completed session or an MFA challenge. Session responses include the staff identity, active roles, effective permissions, MFA state, and assurance level. Role reads require `users.read`; role mutations require `system.manage` plus an MFA-assured session. The final active Owner assignment cannot be removed.
