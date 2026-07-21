# AI Operations Runbook

## Model outage

1. Set `AI_PROVIDER=mock` (grounded deterministic path remains available).
2. Or set `AI_ENABLED=false` to show unavailable state in UI.
3. Monitor Concierge BFF `error` stream events and API logs.

## Provider rate limits

1. Reduce `AI_MAX_DAILY_REQUESTS` if needed.
2. Fall back to mock polish-skip path (already default without key).
3. Communicate degraded mode to support staff.

## Failed knowledge sync

1. Check `AiKnowledgeSource.syncError` via admin Concierge → Knowledge.
2. Retry `POST /api/v1/concierge/knowledge/sync` with secret.
3. Storefront seed corpus still answers policy questions if DB sync fails.

## Database outage

1. Concierge chat (mock path + catalogue mock) can still answer public FAQ.
2. Ticket creation will fail honestly — UI tells customer to use `/contact`.
3. Do not invent ticket references client-side.

## Cart tool failure

1. Concierge must not claim add-to-cart success.
2. Point customer to Design Studio / bag.
3. Check NestJS cart logs and `tms_cart` cookie behaviour.

## Order tool failure

1. Return recoverable failure + account/contact citations.
2. Never invent status or tracking.
3. Verify SessionGuard and ownership queries.

## Incorrect answer report

1. Capture conversation public id.
2. Review citations and tool payloads (not chain-of-thought).
3. Patch knowledge corpus / policy page; re-sync.
4. Add regression test under `lib/concierge/*.spec.ts`.

## Prompt-injection incident

1. Confirm jailbreak did not expand tools (intent tests).
2. Rotate any suspected leaked secrets.
3. Add pattern to intent router denylist if novel.

## Data-deletion request

1. Create HIGH `privacy` support ticket.
2. Delete or anonymise `AiConversation` / `AiMessage` for the subject within retention SLA.
3. Confirm via support channel — Concierge must not self-assert deletion complete without ops confirmation.

## Rollback

1. Set `AI_ENABLED=false`.
2. Remove `<ConciergeRoot />` from storefront layout if a UI rollback is required.
3. Revert Prisma migration only with coordinated DB rollback plan — prefer feature flag first.
