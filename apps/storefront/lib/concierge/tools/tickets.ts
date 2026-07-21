import type { ConciergeCitation, SupportTicketPriority } from '@tms/contracts';
import { apiFetch, ApiNetworkError, ApiRequestError } from '../../data/http';

export interface CreateTicketInput {
  category: string;
  summary: string;
  customerMessage: string;
  aiContextSummary: string;
  priority?: SupportTicketPriority;
  guestEmail?: string;
  orderReference?: string;
  conversationId?: string;
}

export interface CreatedTicket {
  reference: string;
  status: string;
}

/**
 * Creates a support ticket via the API when available. Falls back to a local
 * reference only when the API is unreachable — and never claims a human has
 * received the message unless persistence succeeded.
 */
export async function createSupportTicketTool(
  input: CreateTicketInput,
  cookie?: string,
): Promise<{ ok: boolean; text: string; ticketReference?: string; citations: ConciergeCitation[] }> {
  try {
    const ticket = await apiFetch<CreatedTicket>('/api/v1/concierge/tickets', {
      method: 'POST',
      body: {
        category: input.category,
        summary: input.summary.slice(0, 500),
        customerMessage: input.customerMessage.slice(0, 4_000),
        aiContextSummary: input.aiContextSummary.slice(0, 2_000),
        priority: input.priority ?? 'NORMAL',
        guestEmail: input.guestEmail,
        orderReference: input.orderReference,
        conversationPublicId: input.conversationId,
      },
      ...(cookie ? { cookie } : {}),
    });
    return {
      ok: true,
      text: `I’ve created support case ${ticket.reference}. The studio team will follow up through the contact channel on file. Keep this reference handy.`,
      ticketReference: ticket.reference,
      citations: [
        { kind: 'support', label: 'Contact', description: 'Studio channels', href: '/contact' },
      ],
    };
  } catch (error) {
    if (error instanceof ApiNetworkError || error instanceof ApiRequestError) {
      return {
        ok: false,
        text: 'I could not create a support ticket right now, so I cannot claim the studio has received this yet. Please use the contact page and include your order reference if you have one.',
        citations: [
          { kind: 'support', label: 'Contact the studio', description: 'Email the team directly', href: '/contact' },
        ],
      };
    }
    throw error;
  }
}

export function classifyComplaint(message: string): {
  category: string;
  priority: SupportTicketPriority;
} {
  const text = message.toLowerCase();
  if (/\b(fraud|duplicate payment|charged|payment taken|no order)\b/.test(text)) {
    return { category: 'payment_dispute', priority: 'URGENT' };
  }
  if (/\b(faulty|damaged|misprint|wrong item|missing)\b/.test(text)) {
    return { category: 'quality_fault', priority: 'HIGH' };
  }
  if (/\b(late|overdue|not arrived|delayed)\b/.test(text)) {
    return { category: 'delivery_delay', priority: 'HIGH' };
  }
  if (/\b(privacy|delete my data|gdpr|ndpr)\b/.test(text)) {
    return { category: 'privacy', priority: 'HIGH' };
  }
  if (/\b(change of mind|return)\b/.test(text)) {
    return { category: 'returns_policy', priority: 'NORMAL' };
  }
  return { category: 'general_support', priority: 'NORMAL' };
}
