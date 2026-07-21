# AI Analytics Definitions

## Attribution rules

| Term | Definition |
| --- | --- |
| **Direct** | Customer completed an action (add-to-cart, checkout) in the same conversation turn after an explicit Concierge tool confirmation |
| **Influenced** | Customer opened Concierge within the session and later purchased; chat alone is **not** causation |
| **Unaffected** | Purchase with no Concierge interaction in the session |

Opening the Concierge launcher never counts as causing a sale.

## Event types (`AiAnalyticsEvent.eventType`)

| Event | Meaning |
| --- | --- |
| `conversation_started` | First message in a conversation |
| `intent_classified` | Intent router result |
| `recommendation_shown` | Product cards returned |
| `recommendation_clicked` | Customer followed a card link (client beacon — future) |
| `assisted_add_to_cart` | Cart tool returned success |
| `assisted_checkout` | Checkout completed with prior assisted_add_to_cart in session |
| `support_ticket_created` | Ticket persisted |
| `human_handoff` | Escalation path taken |
| `feedback_submitted` | Thumbs / score |
| `provider_error` | Model/provider failure |
| `rate_limited` | Abuse protection tripped |
| `unanswered` | Low-confidence / escalated without answer |

## Core metrics

- Total AI conversations
- Unique customers assisted (authenticated distinct user ids; guests by conversation)
- Most common intents
- Automated resolution rate (closed without ticket)
- Human handoff rate
- Unanswered-question rate
- CSAT / feedback score
- Recommendation CTR (when click beacon lands)
- AI-assisted add-to-cart rate
- AI-assisted checkout rate (direct vs influenced)
- Revenue influenced (sum of order totals with influenced flag — report separately from direct)
- Top requested products/colours (from search tool args — anonymised)
- Sizing / delivery / payment-failure / return category volumes
- Average time to human resolution (ticket created → resolved)

## Honesty

Never claim the Concierge caused revenue without a direct attribution event.
