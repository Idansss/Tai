# AI Knowledge Sources

## Precedence (highest first)

1. Live order, product, inventory, payment, and customer records (via tools)
2. Admin business settings / Concierge settings
3. Structured catalogue and Design Studio configuration
4. Published policy and support pages (indexed corpus)
5. Published editorial pages and stories
6. General model knowledge (never overrides F.A.T.U facts)

## Seed corpus (storefront)

Located in `apps/storefront/lib/concierge/knowledge/corpus.ts`.

| sourceId          | Type   | URL              | Update mechanism             |
| ----------------- | ------ | ---------------- | ---------------------------- |
| about             | page   | `/about`         | Manual seed + knowledge sync |
| faq-made-to-order | faq    | `/faq`           | Manual seed + knowledge sync |
| delivery          | policy | `/delivery`      | Manual seed + knowledge sync |
| returns           | policy | `/returns`       | Manual seed + knowledge sync |
| size-guide        | policy | `/size-guide`    | Manual seed + knowledge sync |
| faq-payment       | faq    | `/faq`           | Manual seed + knowledge sync |
| faq-combinations  | faq    | `/faq`           | Manual seed + knowledge sync |
| studio-guide      | page   | `/design-studio` | Manual seed + knowledge sync |
| care              | page   | `/care`          | Manual seed + knowledge sync |
| contact           | page   | `/contact`       | Manual seed + knowledge sync |
| privacy           | policy | `/privacy`       | Manual seed + knowledge sync |

Checksum = SHA-256 prefix of content. Obsolete sources should be unpublished via admin/API.

## Live catalogue

Artwork, collection, drop, and price facts come from `dataProvider` / NestJS catalogue endpoints — **not** from the knowledge corpus. Search tool results include current prices only when the provider returns them.

## Database index

Prisma models: `AiKnowledgeSource`, `AiKnowledgeChunk`.

Sync: `POST /api/v1/concierge/knowledge/sync` with header `x-ai-knowledge-sync-secret` (or admin session).

## Not indexed

- Private customer PII
- Order contents as general knowledge
- Payment credentials
- Admin-only notes
- Unpublished drafts

## Citations

Customer-facing links only (label + href). Never expose checksums, chunk IDs, or vector IDs.
