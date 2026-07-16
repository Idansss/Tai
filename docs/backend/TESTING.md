# Backend Testing

Vitest is the baseline runner. Tests sit beside the code they exercise and assert behaviour, failure paths, and boundary conditions. `pnpm test` runs all workspace suites; `pnpm check` adds formatting, linting, type checking, production builds, and Prisma validation.

Later phases add database integration tests against isolated PostgreSQL, permission matrices, webhook fixtures, queue/job tests, contract tests, and API end-to-end tests. Mandatory commerce concurrency and duplicate-event scenarios remain tracked in `docs/progress/BACKEND_TODO.md`.

TMS-B1-002 adds a real HTTP integration suite against disposable PostgreSQL 17. It covers registration validation and duplicate accounts, hashed credentials/tokens, one-time verification, production cookie options, indistinguishable login/recovery failures, session authentication, object-level revocation, revoke-all, password-reset invalidation, logout idempotency, throttling, and audit evidence. Pure unit tests cover scrypt/HMAC helpers, cookie scope, email rendering, error mapping, and shared auth schemas.
