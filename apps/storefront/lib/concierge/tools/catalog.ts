import type { ConciergeCitation, ConciergeProductCard } from '@tms/contracts';
import { dataProvider } from '../../data';

function formatNaira(minor: number | null, currency: string | null): string {
  if (minor == null || !currency) return 'See product page for current price';
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(minor / 100);
}

export async function searchCatalog(query: string): Promise<{
  cards: ConciergeProductCard[];
  citations: ConciergeCitation[];
  summary: string;
}> {
  const q = query.trim();
  const items = q
    ? await dataProvider.searchArtworks(q, 8)
    : (await dataProvider.listArtworks({ limit: 8 })).items;

  // Preference heuristics from free text (budget / mood) without inventing popularity.
  // "under 20000" / "under ₦20,000" → treat as naira major units, convert to minor.
  const budgetMatch = q.match(/under\s*₦?\s*([\d,]+)/i);
  const budgetCeiling = budgetMatch?.[1] ? Number(budgetMatch[1].replace(/,/g, '')) * 100 : null;

  let filtered = items;
  if (budgetCeiling != null && !Number.isNaN(budgetCeiling)) {
    filtered = items.filter(
      (a) => a.startingPriceMinor != null && a.startingPriceMinor <= budgetCeiling,
    );
  }

  if (/\b(lagos|night|bold|city)\b/i.test(q)) {
    const mood = filtered.filter((a) =>
      /lagos|night|okada|city|midnight/i.test(`${a.title} ${a.shortStory} ${a.collection}`),
    );
    if (mood.length > 0) filtered = mood;
  }

  // If the query search returned nothing, fall back to a general catalogue sample.
  if (filtered.length === 0) {
    const fallback = (await dataProvider.listArtworks({ limit: 8 })).items;
    filtered = fallback;
    if (/\b(lagos|night|bold|city)\b/i.test(q)) {
      const mood = fallback.filter((a) =>
        /lagos|night|okada|city|midnight/i.test(`${a.title} ${a.shortStory} ${a.collection}`),
      );
      if (mood.length > 0) filtered = mood;
    }
  }

  const cards: ConciergeProductCard[] = filtered.slice(0, 4).map((a) => ({
    kind: 'product_card' as const,
    title: a.title,
    subtitle: a.collection,
    href: `/artworks/${a.slug}`,
    priceMinor: a.startingPriceMinor,
    currency: a.currency,
    reason: a.shortStory.slice(0, 140),
  }));

  const citations: ConciergeCitation[] = cards.map((c) => ({
    kind: 'artwork' as const,
    label: c.title,
    description: c.subtitle ?? 'Artwork',
    href: c.href,
  }));

  const summary =
    cards.length === 0
      ? 'I could not find matching published artworks for that request in the current catalogue.'
      : `Here are ${cards.length} option${cards.length === 1 ? '' : 's'} from the current catalogue${
          budgetCeiling != null ? ` within your budget` : ''
        }.`;

  return { cards, citations, summary };
}

export async function getArtworkTool(slug: string) {
  const artwork = await dataProvider.getArtwork(slug);
  if (!artwork) {
    return {
      text: 'I could not find that artwork in the current catalogue.',
      cards: [] as ConciergeProductCard[],
      citations: [] as ConciergeCitation[],
    };
  }
  return {
    text: `${artwork.title} is from the ${artwork.collection} collection. ${artwork.shortStory} Starting price: ${formatNaira(artwork.startingPriceMinor, artwork.currency)}. Compatible garments listed on the artwork page: ${artwork.compatibleGarments.join(', ') || 'see artwork page'}.`,
    cards: [
      {
        kind: 'product_card' as const,
        title: artwork.title,
        subtitle: artwork.collection,
        href: `/artworks/${artwork.slug}`,
        priceMinor: artwork.startingPriceMinor,
        currency: artwork.currency,
      },
    ],
    citations: [
      {
        kind: 'artwork' as const,
        label: artwork.title,
        description: 'View artwork',
        href: `/artworks/${artwork.slug}`,
      },
      {
        kind: 'studio' as const,
        label: 'Open in Design Studio',
        description: 'Build with approved garments and placements',
        href: `/design-studio?artwork=${encodeURIComponent(artwork.slug)}`,
      },
    ] satisfies ConciergeCitation[],
  };
}

export async function getCollectionTool(slug: string) {
  const collection = await dataProvider.getCollection(slug);
  if (!collection) {
    return { text: 'I could not find that collection.', citations: [] as ConciergeCitation[] };
  }
  return {
    text: `${collection.name}: ${collection.description}`,
    citations: [
      {
        kind: 'catalogue' as const,
        label: collection.name,
        description: 'Open collection',
        href: `/collections/${collection.slug}`,
      },
    ] satisfies ConciergeCitation[],
  };
}

/**
 * Design Studio deep link — only encodes known query params the studio already understands.
 * Does not invent placement geometry contrary to ADR-013.
 */
export function createDesignStudioDeepLink(input: {
  artworkSlug?: string;
  garment?: string;
  colour?: string;
  size?: string;
}): { href: string; text: string; citations: ConciergeCitation[] } {
  const params = new URLSearchParams();
  if (input.artworkSlug) params.set('artwork', input.artworkSlug);
  if (input.garment) params.set('garment', input.garment);
  if (input.colour) params.set('colour', input.colour);
  if (input.size) params.set('size', input.size);
  const qs = params.toString();
  const href = qs ? `/design-studio?${qs}` : '/design-studio';
  return {
    href,
    text: 'I can open the Design Studio with those selections. Placement options remain studio-approved.',
    citations: [
      {
        kind: 'studio',
        label: 'Continue in Design Studio',
        description: 'Approved garments, colours, and placements only',
        href,
      },
    ],
  };
}

export function validateDesignConfiguration(input: { artworkSlug?: string; garment?: string }): {
  valid: boolean;
  text: string;
  citations: ConciergeCitation[];
} {
  // Without a live studio validation API domain, we refuse to invent validity.
  // Point the customer at the studio which only lists approved combinations.
  if (!input.artworkSlug) {
    return {
      valid: false,
      text: 'Tell me which artwork you want and I will open the Design Studio so you only see approved garment, colour, and placement options.',
      citations: [
        {
          kind: 'studio',
          label: 'Design Studio',
          description: 'Studio-approved combinations only',
          href: '/design-studio',
        },
      ],
    };
  }
  const link = createDesignStudioDeepLink(input);
  return {
    valid: true,
    text: `I will not recommend combinations that are not studio-approved. Use the Design Studio for ${input.artworkSlug}${input.garment ? ` with ${input.garment}` : ''} — it only offers curated options.`,
    citations: link.citations,
  };
}
