# Tai Manic Studios Master Product Specification

## Product

Tai Manic Studios is an art-led commerce platform. Customers discover an artwork and its story, then choose an approved garment type, colour, size, placement, and scale. Administrators control what can be sold and can operate catalogue, inventory, orders, production, quality control, fulfilment, content, and integrations without code changes.

## Core configuration

Every purchasable design resolves to an immutable artwork version plus a garment variant, approved placement, approved scale preset, and view. Blank-garment inventory is shared across compatible artwork configurations. A browser preview is never a production asset.

## Commerce guarantees

The server is authoritative for compatibility, availability, price, discounts, tax, shipping, and totals. Checkout uses expiring inventory reservations and independently verified payment events. Paid orders preserve immutable pricing, artwork, configuration, production, payment, and delivery snapshots.

## Operations

Paid orders move through an audited state machine from production queue to printing, quality check, dispatch, delivery, and completion. Exceptional cancellation, refund, delivery, and return states are explicit. Every transition records actor, reason, correlation ID, and provider event where relevant.

## Platform architecture

The platform is a modular monolith: NestJS API, PostgreSQL via Prisma, Redis/BullMQ workers, S3-compatible media, OpenAPI contracts, structured logs, and provider-neutral payment, shipping, email, storage, and AI boundaries. Mock providers enable development before Flutterwave and GIG Logistics credentials are available.

## Delivery phases

B0 establishes the shared repository. B1 adds identity/security. B2 adds artwork/catalogue. B3 adds Design Studio services. B4 adds commerce. B5 adds provider integrations. B6 adds operations. B7 adds growth/AI. B8 hardens and deploys.

The complete requirements and operating rules are preserved verbatim in `docs/agents/CODEX_BACKEND_MASTER_PROMPT.md`.
