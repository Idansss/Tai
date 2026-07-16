# Architecture Decisions

## ADR-001 — Modular monolith

Status: Accepted. Start with one API and one worker, with domain boundaries inside the codebase. This avoids premature distributed-system cost while preserving extraction paths.

## ADR-002 — OpenAPI is the client contract

Status: Accepted. OpenAPI plus `packages/contracts` is the only supported backend-to-frontend boundary.

## ADR-003 — Artwork-first catalogue

Status: Accepted. Artwork and immutable artwork versions lead the catalogue. Garments are configurable canvases with administrator-approved compatibility and placements.

## ADR-004 — PostgreSQL, Prisma, Redis, BullMQ, S3-compatible storage

Status: Accepted for the backend foundation. Provider implementations remain replaceable behind interfaces.

## ADR-005 — Compatible stable TypeScript toolchain

Status: Accepted. Node 22.18, pnpm 10.20, NestJS 11.1, Prisma 7.8, Turbo 2.10, ESLint 10.7, Vitest 4.1, and TypeScript 6.0 are pinned. TypeScript 7.0 was not selected because typescript-eslint 8.64 supports TypeScript below 6.1.

## ADR-006 — Hashed identity artifacts and append-only audit history

Status: Accepted. Persist only hashes of sessions, verification tokens, reset tokens, and IP addresses. Enforce canonical email/permission values and identity lifecycle ordering with database checks, including required session revocation reasons and token consumption no later than expiry. Model permissions separately from roles and prevent audit-log updates/deletes at the database layer. User deletion is a soft-delete/anonymisation workflow so historical actor references remain intact. Verify these invariants against disposable PostgreSQL rather than mocks.

## ADR-007 — Opaque customer sessions and provider-neutral email

Status: Accepted. Hash passwords with parameterized scrypt and store only deployment-peppered HMAC digests for opaque session and one-time tokens. Deliver verification/recovery links through the shared email-provider boundary using SMTP locally and in compatible deployments. Authenticate browsers with an HttpOnly, SameSite=Lax cookie that is Secure in production. Keep throttling behind a dedicated service; the initial process-local implementation must move to Redis before horizontal scaling.

## ADR-008 — Separate admin sessions with TOTP assurance and database-backed RBAC

Status: Accepted. Administration sessions have a distinct cookie and persisted `ADMIN` audience so customer sessions cannot cross the trust boundary. Effective permissions are recalculated from non-expired database role assignments on every request. TOTP follows RFC 6238 with replayed time steps rejected; shared secrets are encrypted with deployment-specific AES-256-GCM key material and never returned after enrollment. Password and MFA challenges remain separate, short-lived, attempt-bounded records. Sensitive access mutations require both `system.manage` and MFA assurance, Owner elevation is Owner-only, and the final active Owner cannot be removed.

## ADR-009 — Insert-only artwork content with explicit lifecycle transitions

Status: Accepted. An `Artwork` is the stable catalogue root and `ArtworkVersion` is the exact creative/content snapshot. Content changes insert the next ordered draft; version identity, content, metadata, creator, and creation time are immutable in PostgreSQL, and versions cannot be deleted. Only lifecycle status/timestamps may transition. Publishing locks the root, archives the previous publication, and relies on a partial unique index to guarantee one published version. Exact-version asset relations arrive in the media slice without weakening this invariant.

## ADR-010 — Normalized catalogue facets around the artwork root

Status: Accepted. Tags, curated collections, timed drops, editions, and editorial stories are normalized records associated with `Artwork`; none replaces artwork as the creative root or stores mutable discovery state inside an immutable version's metadata. Typed tag kinds support explicit theme, mood, and colour-family filters. Collection/drop membership and story blocks have deterministic ordering. Public discovery composes filters with AND semantics and exposes only published containers, published artwork roots, exact published versions, and published editions. Waitlists, preorders, purchase limits, media, garments, and inventory remain separate dependent domains.

## ADR-011 — Approved garment canvases and exact configuration validation

Status: Accepted. Garments are approved blank canvases for artwork, never creative catalogue roots. Templates own normalized colours, measured sizes, colour/size SKU variants, view placements, and scale presets. Exact artwork-version/template compatibility explicitly allowlists published placements, so a newly published artwork version never inherits an older version's approval. A valid design selection binds one immutable published artwork version to one published variant, placement, scale preset, and view; the server revalidates that tuple instead of trusting browser state. Published template structure is locked until archival, and leaving publication archives existing approvals. Inventory remains variant-based and is added separately so catalogue compatibility does not imply stock.

## ADR-012 — Immutable originals and persistent derivative state

Status: Accepted. Media belongs to an exact immutable artwork version. Validate and scan bytes before storing a content-addressed original; never mutate or delete original bytes or provenance. Redis carries delivery, while PostgreSQL remains authoritative for queued/processing/succeeded/failed state and bounded attempts. Web previews are deterministic derivatives and are never production-print assets. Mockups require explicit approval before public exposure. Storage, scanner, and queue implementations remain provider-neutral so local MinIO/EICAR-aware development can be replaced without changing the domain contract.

## ADR-013 — Approved placements are the only design geometry

Status: Accepted. A saved design binds one immutable published artwork version to one published garment variant, placement, scale preset, and view, exactly as ADR-011 defines a valid selection. The server does not accept, store, or render freeform print geometry.

Context: the Design Studio user interface was built against typed mocks with no backend and offers continuous print placement (`printX`, `printY`, `printWidth`) plus crop (`cropZoom`, `cropX`, `cropY`). No approved-canvas model can express that geometry, so the two representations are irreconcilable.

Consequences: freeform placement and crop controls leave the Studio and are replaced by the placements and scale presets an administrator has actually approved. This preserves the ADR-011 invariant that only administrator-approved configurations are valid, guarantees print resolution and DPI on production output, and keeps the TMS-B3-003 renderer deterministic — an approved tuple always renders one exact result. The cost is real Studio interface rework and the loss of fine customer positioning. A bounded offset within an approved placement box was considered and rejected for this phase because it weakens exact approval; it can be revisited as a separate task without invalidating stored designs, since a bounded offset is additive to the approved tuple.

## ADR-014 — A saved design is identified by its approved tuple, not by quantity

Status: Accepted. `design_configurations` stores the approved tuple and a SHA-256 hash over that tuple only. Quantity is excluded.

Context: the shared `DesignConfigurationInputSchema` carries a quantity because the garment validation endpoint answers "may this be bought, and how many". A saved design answers a different question: "what did the customer make".

Consequences: saving the same design twice is idempotent and collapses onto one row, so `POST /api/v1/designs` returns 201 for a new design and 200 for an identical one, including under a concurrent unique-index race. Quantity moves to the cart in TMS-B4-002. A design is PRIVATE with no share token or UNLISTED with one, and a database check constraint prevents those states from drifting; rotation invalidates the previous link immediately. Ownership failures report not-found rather than forbidden so design identifiers cannot be probed. Foreign keys to the artwork version, variant, placement, and scale preset are RESTRICT so a saved design cannot silently lose the configuration it was built from.

## ADR-015 — Price belongs to the approved artwork and garment pair

Status: Accepted. Money is stored as an integer amount in minor units with an explicit ISO-4217 currency. The base currency is NGN and amounts are kobo. Floating point is never used for money anywhere in the platform.

Context: the storefront already models money this way (`priceMinor`, `currency: 'NGN'`, ₦11,000–₦18,000 per product) and annotates it "server-authoritative later", and Flutterwave settles in NGN minor units. Price varies per product — that is, per artwork on a given garment — and does not vary by size or colour.

Decision: the price hangs on the existing `ArtworkGarmentCompatibility` record, which already binds one exact immutable published artwork version to one published garment template and is explicitly approved by an administrator. An administrator therefore sets the price at the moment they approve that artwork on that garment, and an approved compatibility without a price is not sellable. This keeps pricing inside the same approval gate as ADR-011: there is no way to sell a combination that an administrator did not both approve and price. Because compatibility references an exact `ArtworkVersion` and never the mutable artwork root, publishing a replacement version requires a fresh approval and a fresh price rather than silently inheriting the old one.

Rejected alternatives: a garment base price plus an artwork premium would save administrator effort by letting new artwork inherit a garment's price, but it lets a combination become sellable at a price nobody explicitly chose. Per-variant SKU pricing was rejected as unnecessary surface — six sizes by four colours is twenty-four prices per artwork to keep consistent — and is not what the storefront models.

Consequences: sizes carry no surcharge; one price covers every size and colour of a garment. A per-size modifier can be added later additively without invalidating stored prices or historical orders, because it would be a component of the computed unit price rather than a change to how price is identified. Order snapshots in TMS-B4-003 must copy the resolved amount and currency rather than referencing the compatibility, so a later price change never rewrites history.

## ADR-016 — Row-locked reservations with derived availability

Status: Accepted. Stock is held against the blank garment variant, never against artwork. Available stock is on-hand minus the quantity held by live reservations, and a reservation reduces availability without moving stock.

Context: the final unit of a variant is the case that decides whether the platform oversells. Two shoppers reaching for it at the same instant must not both succeed, and the answer must hold under real concurrency rather than only in a single-threaded test.

Decision: a reservation locks the variant's `inventory_items` row with `SELECT ... FOR UPDATE` and holds that lock for the rest of the transaction, so every concurrent reserver for one variant serialises. Availability is recomputed inside that lock from the reservation rows themselves rather than read from a denormalised counter, so the number cannot drift out of agreement with the reservations that produced it. The cost is that reservations for a single variant are serial; that is acceptable, since the contention is per variant and the critical section is small.

Expiry is evaluated on the reservation path itself: stale holds are expired before availability is computed. A background sweep exists but correctness does not depend on it, so a stopped worker slows cleanup rather than blocking sales. An expired hold can never be committed, because its units may already have been sold to someone else.

Defence in depth: the application refuses to oversell, and a `CHECK (on_hand >= 0)` constraint rejects a negative value even for a direct database write. The movement ledger is append-only through a trigger that rejects UPDATE and DELETE, so stock history is auditable but never rewritable. An adjustment cannot take stock below the quantity already promised to live reservations, which would otherwise send a holder to checkout against stock that no longer exists.

Consequences: `reserve`, `release`, and `commit` are service operations rather than HTTP endpoints, because reservation lifetime belongs to the cart (TMS-B4-002) and checkout (TMS-B4-003) that own the hold. Callers supply the hold duration, so TMS-B4-002 must choose and document a cart hold TTL. Availability in TMS-B3-002 currently reports catalogue permission only; exposing stock publicly and adding an `OUT_OF_STOCK` state is a follow-up once both land.

## ADR-017 — Stock is held at checkout, never by the cart

Status: Accepted. Adding to a cart checks that stock is available but holds nothing. The expiring reservation from ADR-016 is taken when checkout begins.

Context: a hold has to start somewhere, and the two candidates trade the same scarcity against each other. Holding on add-to-cart guarantees that what a customer sees in their cart is genuinely theirs, but every abandoned cart then sits on stock until it expires — on a limited drop that can make the store look sold out while nothing is actually selling. Holding at checkout keeps every unit sellable until someone commits to buying it.

Decision: the cart checks availability on add and on every read, and refuses a quantity stock cannot fulfil, but takes no reservation. TMS-B4-003 checkout takes the hold with a short TTL.

Consequences: a customer can lose the last unit between cart and checkout. That is the deliberate trade, and it obliges the cart to be honest rather than optimistic: every read recomputes availability, a line that can no longer be bought carries an explicit issue, and an unavailable line is excluded from the subtotal instead of being billed for. `hasIssues` exists so checkout can refuse before payment rather than failing at it, and so the interface can say "no longer available" at the cart instead of at the card. Because nothing is held, the cart never needs a countdown, and cart lifetime is a retention question rather than an inventory one.

A future change to hold scarce items — limited drops and numbered editions — on add-to-cart remains open. It is additive: it would call the existing reservation service from the cart without changing how a cart line is stored.
