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

## Customer authentication

`AuthModule` owns customer registration, login, email verification, password reset, secure-cookie sessions, and customer-owned session revocation. It uses the shared Prisma client factory, a provider-neutral SMTP email adapter, explicit public problem codes, and an isolated rate-limiter service. Authentication tokens are opaque browser/email values; only deployment-peppered HMAC digests reach PostgreSQL. The current limiter is process-local and replaceable; distributed Redis storage is required before horizontally scaling the API.

## Administration authentication and authorization

`AdminAuthModule` owns staff login/logout/session hydration, TOTP enrollment and verification, effective-role resolution, permission guards, MFA-assurance guards, staff-session revocation, and role assignments. Customer and admin sessions share lifecycle infrastructure but have different persisted audiences and cookie names. Every admin request reloads active, non-expired role grants from PostgreSQL, so revocation takes effect on the next request without trusting browser state. Object-level service checks distinguish an administrator's own session from another administrator's session; cross-admin revocation requires `system.manage` and MFA.

## Artwork catalogue

`ArtworkModule` owns the creative root and immutable content-version lifecycle. Public reads query only roots and versions in `PUBLISHED` state. Administrator reads return full version history behind `catalogue.read`; writes are explicit create/publish/archive commands behind `catalogue.write`. Version allocation and publication lock the artwork row, so concurrent writers cannot create duplicate sequence numbers or leave more than one published version. Media ownership remains an exact-version concern implemented by TMS-B2-004 rather than a mutable field on the artwork root.

`CatalogueModule` owns normalized discovery and editorial metadata around artwork roots: typed tags, curated collections, timed drops, limited-edition declarations, and stories composed from ordered JSON blocks. Associations point to `Artwork`, never to mutable garment catalogue records or arbitrary version metadata. Public collection/drop/story reads and artwork search filter every root and container to `PUBLISHED`; administrator reads and mutations use the existing `catalogue.read`/`catalogue.write` boundary. Search composes collection, drop, tag-kind, limited-edition, and narrative-text filters with cursor pagination while returning the exact published artwork version.

`GarmentModule` owns approved blank-garment canvases rather than creative catalogue roots. A template normalizes colours, measured sizes, colour/size SKU variants, view-specific print placements, and scale presets. An explicit artwork-version/template compatibility record allowlists eligible placements. Public reads expose only published members, and configuration validation accepts only an exact published `ArtworkVersion`, published variant and members, published placement/view/scale, and approved compatibility. Inventory quantities remain a later variant-owned concern; media bytes remain exact artwork-version assets.

`MediaModule` owns exact artwork-version media. The API validates signatures, declared MIME, extensions, byte and pixel bounds, decodability, transparency, checksums, colour metadata, and a replaceable malware-scanner result before storing an immutable original in S3-compatible storage. A persistent PostgreSQL job is published to BullMQ only after the asset transaction commits. `apps/worker` creates deterministic WebP web and thumbnail derivatives without enlarging or modifying the original, records retries/failures, and upserts outputs idempotently. Generated garment mockups are private until an administrator approves them; public reads never expose originals, pending/rejected mockups, or incomplete assets. Production-print rendering remains a separate B3 service.
