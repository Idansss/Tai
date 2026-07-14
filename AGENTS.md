# Agent Guide

## Product invariant

`Artwork` is the primary creative entity. Garments are approved canvases for immutable artwork versions, not the root catalogue entity.

## Ownership

Codex owns `apps/api`, `apps/worker`, backend packages, `infra`, backend/contract documentation, `docs/handoffs/BACKEND_HANDOFF.md`, `docs/progress/BACKEND_TODO.md`, and `.ai/backend-state.json`.

Claude Code owns `apps/storefront`, `apps/admin`, `packages/ui`, `docs/frontend`, `docs/handoffs/FRONTEND_HANDOFF.md`, `docs/progress/FRONTEND_TODO.md`, and `.ai/frontend-state.json`.

Do not edit another agent's owned implementation. Shared root files require a current `main`, a minimal compatible change, and an explanation in the pull request.

## Contract rules

- OpenAPI is the backend-to-frontend source of truth.
- Keep `packages/contracts` aligned with OpenAPI and tests.
- Record frontend-impacting changes in `docs/coordination/BACKEND_TO_FRONTEND.md`.
- Read `docs/coordination/FRONTEND_TO_BACKEND.md` before starting a backend task.
- Never silently introduce a breaking contract.

## Git workflow

- Never work directly on `main`.
- B0 uses `codex/b0-shared-foundation`; later work uses backend-only branches from the latest `main`.
- Do not start large B1+ modules until B0 is merged.
- Never commit real credentials.

## Commands

- Install: `pnpm install`
- Format: `pnpm format:check`
- Lint: `pnpm lint`
- Type check: `pnpm typecheck`
- Test: `pnpm test`
- Build: `pnpm build`
- Validate Prisma: `pnpm db:validate`
- Full check: `pnpm check`

## Completion

A task is Verified only after implementation, validation, authorization where applicable, safe errors, tests, type checking, linting, build, OpenAPI/contracts, documentation, traceability, TODO evidence, handoff, and backend state are current.
