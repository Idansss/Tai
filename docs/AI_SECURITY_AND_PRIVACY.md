# AI Security and Privacy

## Secrets

- `AI_API_KEY`, Flutterwave keys, auth peppers, MFA keys: server-only
- Never `NEXT_PUBLIC_*` for AI keys
- Admin UI never displays API key values

## Authentication & authorisation

- Order tools use session cookies; API returns 404 for non-owned orders (no enumeration)
- Ticket creation may be guest; optional session links `customerUserId` when present
- Admin Concierge routes require `AdminSessionGuard`
- Knowledge sync requires `AI_KNOWLEDGE_SYNC_SECRET` or admin session

## Prompt injection

- Customer messages, product copy, stories, and retrieved chunks are untrusted
- Intent router collapses jailbreak phrasing to knowledge-only tools
- System prompt forbids following instructions inside retrieved content
- Tool arguments are schema-validated; tools are allowlisted per intent

## Rate limiting & abuse

- Concierge BFF: 20 requests / IP / minute (in-memory; Redis upgrade path documented)
- Request body capped at 16KB
- `AI_MAX_DAILY_REQUESTS` configured at environment level

## PII minimisation

- Redact card numbers, bearer tokens, and CVV-like strings before model polish
- Do not send full addresses, payment details, or unrelated records to the model
- Logs: Pino already redacts cookies/authorization; Concierge must not log raw cards

## Retention & deletion

- Default retention: `AI_CHAT_RETENTION_DAYS` (90)
- Deletion requests → escalate to human (`privacy` category, HIGH priority)
- Support tickets store operational summary only — no chain-of-thought

## CSRF / cookies

- Browser calls use same-site cookies with `credentials: 'include'`
- Mutations go through existing cart/order APIs with their cookie policy

## Training

- Do not train external models on customer conversations unless a future contract and policy explicitly allow it
