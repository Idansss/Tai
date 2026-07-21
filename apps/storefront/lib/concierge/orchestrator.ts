import type {
  ConciergeChatRequest,
  ConciergeChatTurnResult,
  ConciergeCitation,
  ConciergeProductCard,
} from '@tms/contracts';
import { routeIntent } from './intent';
import { formatCitationLinks, retrieveKnowledge } from './knowledge/corpus';
import { buildSystemPrompt } from './prompts/system';
import { redactSensitive, sanitizeModelOutput } from './security/redact';
import { getCartTool } from './tools/cart';
import {
  createDesignStudioDeepLink,
  getArtworkTool,
  getCollectionTool,
  searchCatalog,
  validateDesignConfiguration,
} from './tools/catalog';
import { getCustomerOrdersTool, getOrderStatusTool } from './tools/orders';
import { classifyComplaint, createSupportTicketTool } from './tools/tickets';

function newConversationId(): string {
  return `cv_${crypto.randomUUID().replaceAll('-', '').slice(0, 20)}`;
}

function assistantName(): string {
  return process.env.AI_ASSISTANT_NAME?.trim() || 'F.A.T.U Concierge';
}

function mergeCitations(...lists: ConciergeCitation[][]): ConciergeCitation[] {
  return formatCitationLinks(lists.flat());
}

/**
 * Grounded Concierge turn. Uses live catalogue/knowledge tools. When AI_PROVIDER=openai
 * and AI_API_KEY is set, a thin completion pass can refine wording — but tool facts win.
 * Default/CI path is fully deterministic (mock provider).
 */
export async function runConciergeTurn(
  request: ConciergeChatRequest,
  opts: { cookie?: string; requestId: string } = { requestId: request.clientRequestId },
): Promise<ConciergeChatTurnResult> {
  const conversationId = request.conversationId?.trim() || newConversationId();
  const message = redactSensitive(request.message.trim());
  const intentResult = routeIntent(message, request.context);
  const allowed = new Set(intentResult.allowedTools);

  let text = '';
  let citations: ConciergeCitation[] = [];
  let cards: ConciergeProductCard[] = [];
  let ticketReference: string | undefined;
  let guarded = false;
  let provider: ConciergeChatTurnResult['provider'] = 'mock';

  // Context acknowledgement (verified page facts only).
  const contextBits: string[] = [];
  if (request.context.artworkSlug) {
    contextBits.push(`You are currently viewing artwork “${request.context.artworkSlug}”.`);
  }
  if (request.context.cartSummary && request.context.cartSummary.itemCount > 0) {
    contextBits.push(
      `Your bag summary shows ${request.context.cartSummary.itemCount} item(s) (counts from the client context — open the bag for authoritative totals).`,
    );
  }

  if (intentResult.intent === 'greeting') {
    text = `I’m the ${assistantName()}. I can help you discover artwork, choose a garment and size, understand delivery, or check an order. What would you like to do?`;
    citations = [
      { kind: 'catalogue', label: 'Artworks', description: 'Browse the gallery', href: '/artworks' },
      { kind: 'studio', label: 'Design Studio', description: 'Build a piece', href: '/design-studio' },
      { kind: 'support', label: 'Contact', description: 'Speak to the studio', href: '/contact' },
    ];
  } else if (intentResult.intent === 'human_handoff' || allowed.has('escalate_to_human')) {
    const classified = classifyComplaint(message);
    const ticket = await createSupportTicketTool(
      {
        category: classified.category,
        summary: message.slice(0, 200),
        customerMessage: message,
        aiContextSummary: `Intent ${intentResult.intent}; path ${request.context.pathname}`,
        priority: classified.priority,
        conversationId,
      },
      opts.cookie,
    );
    text = ticket.ok
      ? `I’ll connect you with the studio team. ${ticket.text}`
      : ticket.text;
    ticketReference = ticket.ticketReference;
    citations = ticket.citations;
  } else if (intentResult.intent === 'complaint') {
    const knowledge = retrieveKnowledge(message);
    const classified = classifyComplaint(message);
    if (classified.category === 'returns_policy' && /\bchange of mind\b/i.test(message)) {
      text =
        'Because every piece is made to order, we can’t normally accept change-of-mind returns on a correctly made item. If something arrived faulty or incorrect, we will put it right — share your order reference and I can open a support case.';
      citations = mergeCitations(knowledge.citations, [
        { kind: 'policy', label: 'Returns', description: 'Returns policy', href: '/returns' },
      ]);
      guarded = true;
    } else {
      const ticket = await createSupportTicketTool(
        {
          category: classified.category,
          summary: message.slice(0, 200),
          customerMessage: message,
          aiContextSummary: `Complaint classification ${classified.category}; path ${request.context.pathname}`,
          priority: classified.priority,
          conversationId,
        },
        opts.cookie,
      );
      text = ticket.ok
        ? `${ticket.text} I have not promised a refund or remake — the studio will confirm the next step from policy.`
        : ticket.text;
      ticketReference = ticket.ticketReference;
      citations = mergeCitations(ticket.citations, knowledge.citations);
    }
  } else if (intentResult.intent === 'order_support') {
    const refMatch = message.match(/\b([A-Z0-9]{3,}-[A-Z0-9-]{4,})\b/i);
    if (refMatch?.[1] && allowed.has('get_order_status')) {
      const result = await getOrderStatusTool(refMatch[1], opts.cookie);
      text = result.text;
      citations = result.citations;
    } else if (allowed.has('get_customer_orders')) {
      const result = await getCustomerOrdersTool(opts.cookie);
      text = result.text;
      citations = result.citations;
    }
  } else if (intentResult.intent === 'cart') {
    if (/\badd to (bag|cart)\b/i.test(message)) {
      text =
        'I can add a piece once the artwork, garment, colour, size, and placement are confirmed as an approved combination. Tell me those details, or open the Design Studio / product page to add it yourself — I will never substitute options silently.';
      citations = [
        { kind: 'studio', label: 'Design Studio', description: 'Confirm and add', href: '/design-studio' },
        { kind: 'catalogue', label: 'Your bag', description: 'Review bag', href: '/cart' },
      ];
      guarded = true;
    } else {
      const cart = await getCartTool(opts.cookie);
      text = cart.text;
      citations = cart.citations;
    }
  } else if (intentResult.intent === 'design_studio') {
    const slug =
      request.context.artworkSlug ||
      message.match(/artwork\s+([a-z0-9-]+)/i)?.[1] ||
      undefined;
    const validation = validateDesignConfiguration({ artworkSlug: slug });
    const link = createDesignStudioDeepLink({ artworkSlug: slug });
    text = `${validation.text} ${link.text}`;
    citations = mergeCitations(validation.citations, link.citations);
  } else if (intentResult.intent === 'product_discovery') {
    if (request.context.artworkSlug && /\b(this artwork|about this|tell me about)\b/i.test(message)) {
      const art = await getArtworkTool(request.context.artworkSlug);
      text = art.text;
      cards = art.cards;
      citations = art.citations;
    } else if (/\bcollection\b/i.test(message)) {
      const slug =
        request.context.collectionSlug ||
        message.match(/collection\s+([a-z0-9-]+)/i)?.[1] ||
        'night-studies';
      const col = await getCollectionTool(slug);
      text = col.text;
      citations = col.citations;
      const related = await searchCatalog(message);
      cards = related.cards;
      citations = mergeCitations(citations, related.citations);
      if (related.cards.length) text = `${text}\n\n${related.summary}`;
    } else {
      const found = await searchCatalog(message);
      text = found.summary;
      cards = found.cards;
      citations = found.citations;
      if (cards.length === 0) {
        text += ' Try a different mood, city, or budget, or browse the gallery.';
        citations = mergeCitations(citations, [
          { kind: 'catalogue', label: 'Artworks', description: 'Browse gallery', href: '/artworks' },
        ]);
      }
    }
  } else if (intentResult.intent === 'brand') {
    const knowledge = retrieveKnowledge('about fatu from africa cotton artwork brand studio');
    text =
      knowledge.records.find((r) => r.sourceId === 'about')?.content ??
      knowledge.records[0]?.content ??
      'F.A.T.U — From Africa To You — is an art-led apparel studio. Hand-drawn African artwork is printed on cotton, made to order.';
    citations = mergeCitations(knowledge.citations, [
      { kind: 'policy', label: 'About', description: 'Our story', href: '/about' },
    ]);
  } else {
    // policy / sizing / payment / unknown → knowledge first
    const knowledge = retrieveKnowledge(message);
    if (knowledge.records.length > 0) {
      const top = knowledge.records[0]!;
      text = top.content;
      citations = knowledge.citations;
      // Price/stock deflection stays honest even if knowledge mentions timelines.
      if (/\b(price|how much|in stock|sold out)\b/i.test(message) && intentResult.intent !== 'policy') {
        guarded = true;
        text =
          'I only quote live prices and availability from catalogue tools or the product page — not from memory. Open the artwork or shop page for the current figure.';
        citations = mergeCitations(citations, [
          { kind: 'catalogue', label: 'Shop', description: 'Current prices', href: '/shop' },
        ]);
      }
    } else if (allowed.has('search_catalog')) {
      const found = await searchCatalog(message);
      text = found.summary;
      cards = found.cards;
      citations = found.citations;
    } else {
      text = `I’m not confident I have a grounded answer. I can connect you with the studio team, or you can browse artworks and the Design Studio.`;
      citations = [
        { kind: 'support', label: 'Contact', description: 'Speak to the studio', href: '/contact' },
        { kind: 'catalogue', label: 'Artworks', description: 'Browse', href: '/artworks' },
      ];
    }
  }

  if (contextBits.length && intentResult.intent !== 'greeting') {
    text = `${contextBits.join(' ')}\n\n${text}`;
  }

  // Optional LLM polish — never invents tools; only rephrases when configured.
  if (process.env.AI_PROVIDER === 'openai' && process.env.AI_API_KEY) {
    try {
      const polished = await polishWithOpenAI({
        system: buildSystemPrompt(assistantName()),
        user: message,
        draft: text,
      });
      if (polished) {
        text = polished;
        provider = 'openai';
      }
    } catch {
      provider = 'fallback';
    }
  }

  return {
    conversationId,
    requestId: opts.requestId,
    intent: intentResult.intent,
    text: sanitizeModelOutput(text),
    citations: formatCitationLinks(citations),
    cards,
    ticketReference,
    provider,
    guarded,
  };
}

async function polishWithOpenAI(input: {
  system: string;
  user: string;
  draft: string;
}): Promise<string | null> {
  const model = process.env.AI_MODEL || 'gpt-4.1-mini';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.AI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        { role: 'system', content: input.system },
        {
          role: 'user',
          content: `Customer said: ${input.user}\n\nGrounded draft (do not add facts):\n${input.draft}\n\nRewrite briefly in Concierge voice. Do not add products, prices, policies, or promises absent from the draft.`,
        },
      ],
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) return null;
  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content?.trim() || null;
}
