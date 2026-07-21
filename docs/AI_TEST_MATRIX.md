# AI Concierge Test Matrix

| # | Scenario | Layer | Status |
| --- | --- | --- | --- |
| 1 | What is F.A.T.U? | unit (`concierge.spec`) | covered |
| 2 | Made-to-order explanation | unit | covered |
| 3 | Product under budget | unit (search heuristics) | partial — extend |
| 4 | Bold Lagos artwork | unit | covered |
| 5 | Current price of artwork | unit/tool | via cards when provider has price |
| 6 | Unavailable size | integration | pending API stock domain |
| 7 | Garment combinations for artwork | unit/studio | deep-link guidance |
| 8 | Invalid Design Studio combo | unit | refuses invention |
| 9 | Add valid item to bag | integration | requires `DATA_SOURCE=api` |
| 10 | Delivery timing | knowledge | covered via corpus |
| 11 | Change-of-mind return | unit | covered |
| 12 | Wrong item received | ticket classification | covered |
| 13 | Signed-in order track | integration | requires API + session |
| 14 | Access another person’s order | API ownership | existing order e2e |
| 15 | Payment taken, no order | complaint URGENT | covered classify |
| 16 | Request human | handoff | covered intent |
| 17 | Provider unavailable | mock fallback | default path |
| 18 | Catalog service fails | tool error text | pending dedicated test |
| 19 | Malicious system prompt reveal | unit | covered |
| 20 | Retrieved doc with instructions | precedence + prompt | covered by design |
| 21 | Mobile open/minimise/restore | e2e | pending Playwright |
| 22 | Keyboard-only conversation | e2e | pending Playwright |
| 23 | Admin policy update → answer | sync | pending live admin article CRUD |
| 24 | Unconfident → escalate | unit | unknown path |

## Commands

```bash
pnpm --filter @tms/storefront test
pnpm --filter @tms/configuration test
pnpm --filter @tms/api test
pnpm --filter @tms/database db:validate
pnpm --filter @tms/storefront build
```
