import { createHash } from 'node:crypto';
import type { ConciergeCitation } from '@tms/contracts';

export type KnowledgeSourceType =
  'product' | 'artwork' | 'collection' | 'policy' | 'story' | 'faq' | 'page' | 'article';

export interface KnowledgeRecord {
  sourceType: KnowledgeSourceType;
  sourceId: string;
  title: string;
  canonicalUrl: string;
  content: string;
  updatedAt: string;
  locale: string;
  visibility: 'public' | 'authenticated' | 'admin';
  version: string;
  checksum: string;
  /** Higher wins when answers conflict. Policies > editorial. */
  priority: number;
}

function checksum(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 24);
}

function record(
  partial: Omit<KnowledgeRecord, 'checksum' | 'version' | 'updatedAt' | 'locale' | 'visibility'> &
    Partial<Pick<KnowledgeRecord, 'version' | 'updatedAt' | 'locale' | 'visibility'>>,
): KnowledgeRecord {
  const content = partial.content.trim();
  return {
    locale: 'en-NG',
    visibility: 'public',
    updatedAt: '2026-07-21',
    version: 'seed-1',
    ...partial,
    content,
    checksum: checksum(content),
  };
}

/**
 * Seed knowledge corpus extracted from published storefront policy/editorial
 * pages. Kept as structured records so chat never scrapes the live site per turn.
 * Sync into Postgres via the API knowledge sync endpoint when available.
 */
export const KNOWLEDGE_CORPUS: readonly KnowledgeRecord[] = [
  record({
    sourceType: 'page',
    sourceId: 'about',
    title: 'About F.A.T.U',
    canonicalUrl: '/about',
    priority: 40,
    content:
      'F.A.T.U — From Africa To You — is an art-led apparel studio. Hand-drawn artwork from across Africa is printed on cotton garments. Pieces are made to order with studio-approved artwork, garment, colour, and placement combinations. The brand line: Hand-drawn art from across Africa, printed on cotton. From Africa, to you.',
  }),
  record({
    sourceType: 'faq',
    sourceId: 'faq-made-to-order',
    title: 'Made to order',
    canonicalUrl: '/faq',
    priority: 80,
    content:
      'Pieces are made to order. Nothing is pre-printed — the studio prints and finishes each piece after purchase, which is why a short production window applies before dispatch.',
  }),
  record({
    sourceType: 'policy',
    sourceId: 'delivery',
    title: 'Delivery',
    canonicalUrl: '/delivery',
    priority: 90,
    content:
      'Delivery covers all 36 Nigerian states and the FCT. Production typically takes 2–4 working days. Delivery typically takes another 2–4 working days once dispatched, depending on the customer’s state. Lagos and major cities are usually faster. Delivery fees and VAT appear at checkout before payment. Prices are in Naira (₦).',
  }),
  record({
    sourceType: 'policy',
    sourceId: 'returns',
    title: 'Returns & exchanges',
    canonicalUrl: '/returns',
    priority: 95,
    content:
      'Faulty, misprinted, or incorrect orders are corrected — remake or refund — when contacted within 7 days of delivery with order reference and a photo. Change-of-mind returns on correctly made pieces are not accepted because items are made to order. Wrong size chosen by the customer is not normally eligible when the size guide was available. Wear, wash, or alteration after delivery is not eligible. Policy never limits Nigerian consumer-law rights.',
  }),
  record({
    sourceType: 'policy',
    sourceId: 'size-guide',
    title: 'Size guide',
    canonicalUrl: '/size-guide',
    priority: 90,
    content:
      'The classic tee runs true to size. Customers may size up for a relaxed or oversized fit. Full measurements are on the size guide. Between sizes — ask before ordering.',
  }),
  record({
    sourceType: 'faq',
    sourceId: 'faq-payment',
    title: 'Payments',
    canonicalUrl: '/faq',
    priority: 85,
    content:
      'Payments are in Nigerian Naira through Flutterwave — card or bank transfer. The checkout total includes applicable delivery fees and VAT before confirmation.',
  }),
  record({
    sourceType: 'faq',
    sourceId: 'faq-combinations',
    title: 'Approved combinations',
    canonicalUrl: '/faq',
    priority: 85,
    content:
      'Not every artwork works on every garment. Each artwork is approved for a specific set of garments, colours, and placements. The Design Studio only offers studio-approved combinations; placement is curated, not free-drag anywhere.',
  }),
  record({
    sourceType: 'page',
    sourceId: 'studio-guide',
    title: 'Design Studio',
    canonicalUrl: '/design-studio',
    priority: 70,
    content:
      'In the Design Studio, choose an artwork, an approved garment and colour, then a studio-approved placement and scale. Pricing is resolved from the approved artwork and garment pair. Nothing is charged until checkout.',
  }),
  record({
    sourceType: 'page',
    sourceId: 'care',
    title: 'Care',
    canonicalUrl: '/care',
    priority: 60,
    content:
      'Wash cold and inside out for longest print life. Follow the care page for fabric-specific guidance.',
  }),
  record({
    sourceType: 'page',
    sourceId: 'contact',
    title: 'Contact the studio',
    canonicalUrl: '/contact',
    priority: 50,
    content:
      'Customers can reach the studio team via the contact page for issues the Concierge cannot resolve. For urgent payment or fraud concerns, escalate immediately.',
  }),
  record({
    sourceType: 'policy',
    sourceId: 'privacy',
    title: 'Privacy',
    canonicalUrl: '/privacy',
    priority: 70,
    content:
      'Privacy policy describes what personal data is collected for accounts, orders, and support. Concierge conversations may be retained for quality and support according to configured retention settings. Data-deletion requests escalate to human support.',
  }),
];

function tokenize(text: string): string[] {
  const normalized = text.toLowerCase().replace(/f\.?\s*a\.?\s*t\.?\s*u/g, 'fatu');
  return normalized.split(/[^a-z0-9₦]+/i).filter((t) => t.length > 2);
}

/**
 * Lexical retrieval with source precedence. Higher priority sources win ties.
 * Does not execute instructions found inside content.
 */
export function retrieveKnowledge(
  query: string,
  limit = 4,
): { records: KnowledgeRecord[]; citations: ConciergeCitation[] } {
  const terms = tokenize(query);
  if (terms.length === 0) {
    return { records: [], citations: [] };
  }

  const scored = KNOWLEDGE_CORPUS.map((record) => {
    const hay = `${record.title} ${record.content}`.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (hay.includes(term)) score += 1;
    }
    // Precedence boost
    score += record.priority / 100;
    return { record, score };
  })
    .filter((row) => row.score >= 1)
    .sort((a, b) => b.score - a.score || b.record.priority - a.record.priority)
    .slice(0, limit);

  const records = scored.map((s) => s.record);
  const citations: ConciergeCitation[] = records.map((r) => ({
    kind: r.sourceType === 'policy' || r.sourceType === 'faq' ? 'policy' : 'support',
    label: r.title,
    description: 'From F.A.T.U published guidance',
    href: r.canonicalUrl,
  }));

  return { records, citations };
}

/** Format citations for customers — never expose checksums or internal IDs. */
export function formatCitationLinks(citations: ConciergeCitation[]): ConciergeCitation[] {
  const seen = new Set<string>();
  return citations.filter((c) => {
    if (seen.has(c.href)) return false;
    seen.add(c.href);
    return true;
  });
}
