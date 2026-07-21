import type { ConciergeIntent, ConciergePageContext } from '@tms/contracts';

export interface IntentResult {
  intent: ConciergeIntent;
  /** Tools that are allowed for this turn (minimum set). */
  allowedTools: readonly string[];
  confidence: 'high' | 'medium' | 'low';
}

const TOOLS = {
  knowledge: 'retrieve_knowledge',
  search: 'search_catalog',
  artwork: 'get_artwork',
  product: 'get_product',
  collection: 'get_collection',
  price: 'get_current_price',
  studio: 'get_design_studio_options',
  validateStudio: 'validate_design_configuration',
  deepLink: 'create_design_studio_deep_link',
  cartGet: 'get_cart',
  cartAdd: 'add_to_cart',
  orders: 'get_customer_orders',
  orderStatus: 'get_order_status',
  ticket: 'create_support_ticket',
  escalate: 'escalate_to_human',
} as const;

/**
 * Cheap intent classification — keeps greetings/FAQ off expensive order/cart tools.
 * Prompt-injection attempts that ask to ignore rules still route, but tools stay allowlisted.
 */
export function routeIntent(message: string, context?: ConciergePageContext): IntentResult {
  const text = message.toLowerCase().trim();

  // Injection / jailbreak attempts → treat as unknown with knowledge only; never expand tools.
  if (
    /\b(ignore (all |previous )?instructions|system prompt|reveal (your )?prompt|developer mode|jailbreak)\b/.test(
      text,
    )
  ) {
    return { intent: 'unknown', allowedTools: [TOOLS.knowledge], confidence: 'high' };
  }

  if (/^(hi|hello|hey|good (morning|afternoon|evening))\b/.test(text) || text.length < 12) {
    if (/^(hi|hello|hey)\b/.test(text)) {
      return { intent: 'greeting', allowedTools: [], confidence: 'high' };
    }
  }

  if (/\b(human|agent|someone|real person|speak to|talk to (a |the )?person|escalat)\b/.test(text)) {
    return {
      intent: 'human_handoff',
      allowedTools: [TOOLS.escalate, TOOLS.ticket],
      confidence: 'high',
    };
  }

  if (
    /\b(faulty|damaged|wrong item|missing item|complaint|refund|duplicate payment|fraud|not received)\b/.test(
      text,
    )
  ) {
    return {
      intent: 'complaint',
      allowedTools: [TOOLS.ticket, TOOLS.escalate, TOOLS.orderStatus, TOOLS.knowledge],
      confidence: 'high',
    };
  }

  if (/\b(my order|order status|where.*(order)|track|tracking|order number|order ref)\b/.test(text)) {
    return {
      intent: 'order_support',
      allowedTools: [TOOLS.orders, TOOLS.orderStatus, TOOLS.ticket, TOOLS.knowledge],
      confidence: 'high',
    };
  }

  if (/\b(pay|payment|flutterwave|card|bank transfer|vat|charged)\b/.test(text)) {
    return {
      intent: 'payment',
      allowedTools: [TOOLS.knowledge, TOOLS.ticket],
      confidence: 'high',
    };
  }

  if (/\b(add to (bag|cart)|remove from (bag|cart)|my bag|my cart|update cart)\b/.test(text)) {
    return {
      intent: 'cart',
      allowedTools: [TOOLS.cartGet, TOOLS.cartAdd, TOOLS.search, TOOLS.product],
      confidence: 'high',
    };
  }

  if (
    /\b(design studio|placement|compatible garment|mockup|put .+ on|customi[sz]e)\b/.test(text) ||
    context?.pageType === 'design-studio'
  ) {
    if (/\b(design studio|placement|compatible|mockup|customi[sz]e)\b/.test(text)) {
      return {
        intent: 'design_studio',
        allowedTools: [TOOLS.studio, TOOLS.validateStudio, TOOLS.deepLink, TOOLS.artwork, TOOLS.knowledge],
        confidence: 'high',
      };
    }
  }

  if (/\b(size|sizing|fit|measurement|true to size|size up|size down)\b/.test(text)) {
    return {
      intent: 'sizing',
      allowedTools: [TOOLS.knowledge],
      confidence: 'high',
    };
  }

  if (
    /\b(return|returns|exchange|change of mind|delivery|shipping|dispatch|made to order|production)\b/.test(
      text,
    )
  ) {
    return { intent: 'policy', allowedTools: [TOOLS.knowledge], confidence: 'high' };
  }

  if (
    /\b(what is f\.?\s*a\.?\s*t\.?\s*u|what is fatu|about (the )?(brand|studio)|from africa to you)\b/.test(
      text,
    )
  ) {
    return { intent: 'brand', allowedTools: [TOOLS.knowledge], confidence: 'high' };
  }

  if (
    /\b(recommend|suggest|find|looking for|under|budget|artwork|collection|drop|tee|hoodie|gift)\b/.test(
      text,
    ) ||
    context?.pageType === 'shop' ||
    context?.pageType === 'artwork'
  ) {
    return {
      intent: 'product_discovery',
      allowedTools: [TOOLS.search, TOOLS.artwork, TOOLS.collection, TOOLS.price, TOOLS.product],
      confidence: 'medium',
    };
  }

  return {
    intent: 'unknown',
    allowedTools: [TOOLS.knowledge, TOOLS.search],
    confidence: 'low',
  };
}
