/**
 * Studio Guide — customer AI assistant, mock responder (TMS-F5-008). This is a
 * deterministic, pure stand-in for the real assistant endpoint (TMS-FBR-009).
 * Two rules matter most:
 *
 *  1. **Guardrails** — the guide must never invent live stock, price, or
 *     delivery facts. Those questions get a deflection that points to the
 *     authoritative source (the product page / the studio), never a number.
 *  2. **No auto-actions** — it only ever answers and links; it never places
 *     orders, changes carts, or promises anything on the customer's behalf.
 *
 * Order-status questions need a live tool the preview can't call, so they return
 * a `tool_error` outcome to exercise the failure + retry UI honestly.
 */

export type GuideReferenceKind = 'studio' | 'catalogue' | 'support' | 'policy';

export interface GuideReference {
  kind: GuideReferenceKind;
  label: string;
  description: string;
  href: string;
}

export interface GuideReply {
  text: string;
  references: GuideReference[];
  /** True when the reply declined to invent live stock/price/delivery data. */
  guardrail: boolean;
}

export type GuideOutcome =
  | { kind: 'reply'; reply: GuideReply }
  | { kind: 'tool_error'; tool: string; message: string; references: GuideReference[] };

export const SUGGESTED_PROMPTS = [
  'How do I design my own piece?',
  'Tell me about the artworks',
  'What sizes do you offer?',
  'Where is my order?',
  'How do returns work?',
  'Is this in stock?',
] as const;

const REF = {
  studio: {
    kind: 'studio',
    label: 'Design Studio',
    description: 'Place any artwork on a garment and preview it.',
    href: '/design-studio',
  },
  artworks: {
    kind: 'catalogue',
    label: 'Artworks',
    description: 'Browse the full gallery of pieces.',
    href: '/artworks',
  },
  shop: {
    kind: 'catalogue',
    label: 'Shop',
    description: 'Ready-made products with live prices on each page.',
    href: '/shop',
  },
  sizeGuide: {
    kind: 'policy',
    label: 'Size guide',
    description: 'Measurements and fit for every garment.',
    href: '/size-guide',
  },
  returns: {
    kind: 'policy',
    label: 'Returns',
    description: 'How returns and exchanges work.',
    href: '/returns',
  },
  care: {
    kind: 'policy',
    label: 'Care',
    description: 'Washing and care for your pieces.',
    href: '/care',
  },
  delivery: {
    kind: 'policy',
    label: 'Delivery',
    description: 'Delivery options and timeframes.',
    href: '/delivery',
  },
  orders: {
    kind: 'support',
    label: 'Your orders',
    description: 'Sign in to see order status and tracking.',
    href: '/account/orders',
  },
  contact: {
    kind: 'support',
    label: 'Contact the studio',
    description: 'Reach a human on the team.',
    href: '/contact',
  },
} satisfies Record<string, GuideReference>;

const match = (text: string, re: RegExp) => re.test(text);

/**
 * Produce a deterministic outcome for a customer prompt. Pure — the chat UI
 * awaits a thin async wrapper around this, and any unit test can call it
 * directly.
 */
export function studioGuideRespond(prompt: string): GuideOutcome {
  const text = prompt.toLowerCase().trim();

  // Order status needs a live tool the preview can't reach — surface a
  // recoverable tool error (with a human-support route), never a made-up status.
  if (
    match(text, /\b(my order|order status|where('| i)s my order|track|tracking|order number)\b/)
  ) {
    return {
      kind: 'tool_error',
      tool: 'order-lookup',
      message:
        "I can't reach the order-status tool in this preview, so I can't look that up right now.",
      references: [REF.orders, REF.contact],
    };
  }

  // Guardrail: never invent live price / stock / delivery-time facts.
  if (match(text, /\b(price|cost|how much|discount|cheaper|expensive|naira|₦)\b/)) {
    return {
      kind: 'reply',
      reply: {
        guardrail: true,
        text: "I can't quote prices in this preview — but every product page shows its current price, and the Design Studio prices your piece as you build it.",
        references: [REF.shop, REF.studio],
      },
    };
  }
  if (match(text, /\b(in stock|out of stock|stock|available|availability|sold out|restock)\b/)) {
    return {
      kind: 'reply',
      reply: {
        guardrail: true,
        text: "I can't confirm live stock here. Each product page shows whether an item is available, limited, or sold out — and you can join the waitlist if something's sold out.",
        references: [REF.shop],
      },
    };
  }
  if (match(text, /\b(deliver|delivery|ship|shipping|arrive|dispatch|how long.*(get|arrive))\b/)) {
    return {
      kind: 'reply',
      reply: {
        guardrail: true,
        text: "I can't promise a delivery date in this preview. The Delivery page lists the options and timeframes, and your order confirmation carries the estimate for your address.",
        references: [REF.delivery, REF.contact],
      },
    };
  }

  // Topic answers (no live facts involved).
  if (match(text, /\b(design|studio|customi|make my own|create|placement|mockup|put.*on)\b/)) {
    return reply(
      'You can design your own piece in the Design Studio: pick an artwork, choose a garment and colour, then position and scale the print. Nothing is charged until you check out.',
      [REF.studio, REF.artworks],
    );
  }
  if (match(text, /\b(size|sizing|fit|measurement|true to size|small|large)\b/)) {
    return reply(
      'Fit varies by garment — the size guide has measurements for each one, and every product page notes whether it runs true to size or relaxed.',
      [REF.sizeGuide, REF.shop],
    );
  }
  if (match(text, /\b(artwork|art|gallery|collection|drawing|piece|print|drop)\b/)) {
    return reply(
      'Every piece starts as an original drawing. Browse the gallery to explore the artworks and collections, then wear one as-is or design your own in the Studio.',
      [REF.artworks, REF.studio],
    );
  }
  if (match(text, /\b(return|refund|exchange)\b/)) {
    return reply(
      'Returns are covered on the Returns page — it explains the window and how to start one. For a specific order, our team can help directly.',
      [REF.returns, REF.contact],
    );
  }
  if (match(text, /\b(care|wash|iron|shrink|fabric)\b/)) {
    return reply(
      'Our prints last longest washed cold and inside out. The Care page has the full guidance for each fabric.',
      [REF.care],
    );
  }
  if (match(text, /\b(human|agent|someone|support|contact|talk to|person|team|help me)\b/)) {
    return reply(
      'Happy to point you to a human — the studio team can help with anything I can’t. Use the contact page and they’ll get back to you.',
      [REF.contact],
    );
  }

  // Fallback.
  return reply(
    "I'm the Studio Guide — I can help you explore the artworks, design your own piece, and find the right size or policy. What would you like to do?",
    [REF.artworks, REF.studio, REF.contact],
  );
}

function reply(text: string, references: GuideReference[]): GuideOutcome {
  return { kind: 'reply', reply: { text, references, guardrail: false } };
}
