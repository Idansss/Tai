# Backend Architecture

## Shape

Tai Manic Studios uses a modular monolith. `apps/api` owns synchronous HTTP boundaries; `apps/worker` owns asynchronous jobs. Domain modules will live behind explicit service and persistence boundaries so extraction is possible later without paying the operational cost of premature microservices.

## Data flow

Clients call `/api/v1`. Middleware assigns a correlation ID, validation rejects malformed input, guards enforce authentication and permissions, services execute domain logic inside explicit transactions, persistence uses PostgreSQL, and jobs are handed to BullMQ. Public errors are sanitised and conform to the shared error contract.

## Dependencies

- PostgreSQL: authoritative relational state and commerce transactions
- Redis: queues, throttling, short-lived coordination, and caches
- S3-compatible storage: immutable originals, derivatives, previews, and production assets
- BullMQ: media, render, notification, reconciliation, reservation expiry, and integration retry jobs

## Boundaries

OpenAPI and `packages/contracts` are public platform boundaries. Provider packages implement interfaces owned by domain modules. No provider payload or browser-submitted price is trusted as domain truth.
