# Backend Security

Security is enforced server-side. Frontend visibility is never authorization.

The baseline includes strict DTO validation, sanitised error responses, correlation IDs, security headers, environment-only secrets, and dependency auditing in CI. B1 adds password hashing, secure sessions, CSRF strategy, login throttling, verification/reset flows, granular RBAC, object-level authorization, audit logs, export/deletion requests, and MFA-ready admin authentication.

Webhook work must validate signatures, persist raw events safely, reject amount/currency/reference mismatches, and process provider events idempotently. Media work must validate type, extension, dimensions, size, and malware-scan state. Never store card data or log tokens, secrets, raw signatures, SQL errors, stack traces, or provider credentials.
