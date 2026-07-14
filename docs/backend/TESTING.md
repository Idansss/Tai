# Backend Testing

Vitest is the baseline runner. Tests sit beside the code they exercise and assert behaviour, failure paths, and boundary conditions. `pnpm test` runs all workspace suites; `pnpm check` adds formatting, linting, type checking, production builds, and Prisma validation.

Later phases add database integration tests against isolated PostgreSQL, permission matrices, webhook fixtures, queue/job tests, contract tests, and API end-to-end tests. Mandatory commerce concurrency and duplicate-event scenarios remain tracked in `docs/progress/BACKEND_TODO.md`.
