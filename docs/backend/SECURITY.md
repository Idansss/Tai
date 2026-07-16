# Backend Security

Security is enforced server-side. Frontend visibility is never authorization.

The baseline includes strict DTO validation, sanitised error responses, correlation IDs, security headers, environment-only secrets, and dependency auditing in CI. B1 adds password hashing, secure sessions, CSRF strategy, login throttling, verification/reset flows, granular RBAC, object-level authorization, audit logs, export/deletion requests, and MFA-ready admin authentication.

Webhook work must validate signatures, persist raw events safely, reject amount/currency/reference mismatches, and process provider events idempotently. Media work must validate type, extension, dimensions, size, and malware-scan state. Never store card data or log tokens, secrets, raw signatures, SQL errors, stack traces, or provider credentials.

## Customer authentication controls

- Passwords are salted with random 128-bit salts and hashed with scrypt (`N=32768`, `r=8`, `p=1`, 64-byte output).
- Sessions and one-time links use 256-bit random tokens; PostgreSQL stores only HMAC-SHA-256 digests keyed by `AUTH_TOKEN_PEPPER`.
- Production refuses the checked-in local pepper. Logs redact authorization, cookies, and `Set-Cookie`.
- Session cookies are HttpOnly, SameSite=Lax, scoped to `/api/v1`, and Secure in production. SameSite plus same-origin JSON requests is the current CSRF boundary.
- Login failures use one public response; verification/reset requests always return the same accepted envelope for known and unknown accounts.
- Password reset consumes one token transactionally and revokes every active session.
- Session deletion is restricted by the authenticated user ID; cross-customer attempts return not found.
- Authentication attempts are bounded by a process-local, HMAC-keyed limiter. Replace its storage with Redis before running multiple API replicas.

## Administrator authentication and authorization controls

- Administration uses a separate `tms_admin_session` cookie and an `ADMIN` database audience; neither customer cookies nor customer-audience session rows satisfy the admin guard.
- Active administrators must have an active user, verified email, active admin profile, password, and at least one unexpired role assignment.
- TOTP implements RFC 6238 over RFC 4226 with a 30-second step, a one-step clock-skew window, attempt-bounded password challenges, transactional challenge consumption, and rejection of reused time steps.
- TOTP shared secrets are encrypted with AES-256-GCM under `ADMIN_MFA_ENCRYPTION_KEY`; production rejects the checked-in local-only key. Raw secrets are returned only during enrollment and are never logged.
- Effective permissions are loaded from PostgreSQL on every request. Decorator metadata is enforced by server-side permission guards; sensitive mutations additionally require an MFA-assured session.
- A user may revoke their own admin session. Revoking another user's session requires `system.manage` and MFA. Assigning or revoking Owner requires an Owner actor, and the final active Owner is protected.
- Bootstrap provisioning is an explicit environment-driven operator command. It creates no checked-in credential, validates the canonical role, hashes the supplied password, defaults MFA to required, and appends a system audit record.
- Lost-device recovery is an explicit operator-only MFA reset command. It revokes the factor, every admin session and challenge, forces MFA to remain required, and appends a system audit record before the next enrollment.

## Artwork authorization and integrity controls

- Public catalogue reads filter both the artwork root and its exact version to `PUBLISHED`; draft and archived content return not found rather than leaking through nested records.
- Administrator reads require `catalogue.read`; every create, version, publish, and archive command requires `catalogue.write`. Permission denial is audited by the shared admin guard.
- Artwork/version identifiers are checked as a pair before lifecycle changes, preventing a valid version ID from being replayed against another artwork.
- PostgreSQL rejects version content updates and every version delete independently of the HTTP layer. Publication locks the artwork row and a partial unique index enforces one published version under concurrent requests.
- Lifecycle commands append actor/correlation-aware audit records. Browser input cannot set version numbers, status, publication timestamps, creator IDs, or audit outcome.
- Catalogue lists and details suppress draft/archived containers and suppress draft/archived artwork members nested in otherwise published collections or drops.
- Catalogue administrator reads require `catalogue.read`; tag, collection, drop, edition, association, and story mutations require `catalogue.write` and append actor/correlation-aware audit records.
- DTO validation and PostgreSQL checks both enforce drop windows, edition quantities, story ownership, and ordered blocks. Unique/foreign-key conflicts are mapped to stable safe errors without exposing SQL details.
