# Changelog — F.A.T.U Concierge (2026-07-21)

## Added

- Storefront Concierge UI (launcher + accessible panel) and streaming BFF `POST /api/concierge/chat`
- Grounded orchestrator with intent routing, knowledge corpus, catalogue/cart/order/ticket tools
- NestJS `ConciergeModule` — tickets, knowledge sync, admin metrics/conversations
- Prisma models for conversations, messages, knowledge, tickets, analytics, settings
- Admin `/concierge` operations console
- Documentation suite under `docs/AI_*.md`
- Environment placeholders for `AI_*` in `.env.example` and `@tms/configuration`

## Notes

- Default `AI_PROVIDER=mock` — no API key required for CI/dev grounded answers
- Guest OTP order lookup and fault image upload remain follow-ups
- Production LLM polish activates when `AI_PROVIDER=openai` and `AI_API_KEY` are set
