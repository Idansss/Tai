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
