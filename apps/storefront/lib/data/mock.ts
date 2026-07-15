import type { CursorPage } from '@tms/contracts';
import { artworkMatchesQuery } from '../search';
import type {
  ArtworkDetail,
  ArtworkSummary,
  Availability,
  CollectionDetail,
  CollectionSummary,
  DeliveryOption,
  DropDetail,
  DropSummary,
  ListArtworksParams,
  ProductDetail,
  ProductSummary,
  StorefrontDataProvider,
  StudioOptions,
} from './types';

const COLOUR_PALETTE: Record<string, string> = {
  Black: '#1a1a1a',
  Bone: '#efeae0',
  Sand: '#d8c7a8',
  Olive: '#5f6046',
  Slate: '#3a4654',
};

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

interface ProductSeed {
  slug: string;
  artworkSlug: string;
  artworkTitle: string;
  collection: string;
  garment: string;
  priceMinor: number;
  availability: Availability;
  colours: string[];
  unavailableColours?: string[];
  soldOutSizes?: string[];
}

const productSeeds: ProductSeed[] = [
  {
    slug: 'midnight-in-lagos-classic-tee',
    artworkSlug: 'midnight-in-lagos',
    artworkTitle: 'Midnight in Lagos',
    collection: 'Night Studies',
    garment: 'Classic T-shirt',
    priceMinor: 1200000,
    availability: 'available',
    colours: ['Black', 'Bone', 'Slate'],
    soldOutSizes: ['XS'],
  },
  {
    slug: 'paper-tigers-oversized-tee',
    artworkSlug: 'paper-tigers',
    artworkTitle: 'Paper Tigers',
    collection: 'Comic Line',
    garment: 'Oversized T-shirt',
    priceMinor: 1500000,
    availability: 'limited',
    colours: ['Black', 'Bone', 'Sand'],
    unavailableColours: ['Sand'],
    soldOutSizes: ['XXL'],
  },
  {
    slug: 'harmattan-bloom-classic-tee',
    artworkSlug: 'harmattan-bloom',
    artworkTitle: 'Harmattan Bloom',
    collection: 'Season Sketches',
    garment: 'Classic T-shirt',
    priceMinor: 1100000,
    availability: 'available',
    colours: ['Bone', 'Sand', 'Olive'],
  },
  {
    slug: 'market-day-longsleeve',
    artworkSlug: 'market-day',
    artworkTitle: 'Market Day',
    collection: 'City Portraits',
    garment: 'Long-sleeve shirt',
    priceMinor: 1800000,
    availability: 'limited',
    colours: ['Black', 'Slate', 'Olive'],
    soldOutSizes: ['S', 'XXL'],
  },
  {
    slug: 'okada-run-oversized-tee',
    artworkSlug: 'okada-run',
    artworkTitle: 'Okada Run',
    collection: 'City Portraits',
    garment: 'Oversized T-shirt',
    priceMinor: 1250000,
    availability: 'sold_out',
    colours: ['Black', 'Bone'],
  },
  {
    slug: 'lantern-keeper-classic-tee',
    artworkSlug: 'lantern-keeper',
    artworkTitle: 'Lantern Keeper',
    collection: 'Night Studies',
    garment: 'Classic T-shirt',
    priceMinor: 1300000,
    availability: 'available',
    colours: ['Black', 'Slate', 'Sand'],
  },
];

function toProductSummary(seed: ProductSeed): ProductSummary {
  return {
    id: seed.slug,
    slug: seed.slug,
    title: `${seed.artworkTitle} — ${seed.garment}`,
    artworkSlug: seed.artworkSlug,
    artworkTitle: seed.artworkTitle,
    collection: seed.collection,
    garment: seed.garment,
    priceMinor: seed.priceMinor,
    currency: 'NGN',
    availability: seed.availability,
    colourCount: seed.colours.length,
  };
}

function toProductDetail(seed: ProductSeed): ProductDetail {
  return {
    ...toProductSummary(seed),
    description: `${seed.artworkTitle} printed on our ${seed.garment.toLowerCase()}. A gallery piece you can wear.`,
    fabric: '100% organic combed cotton, 180gsm.',
    fit: seed.garment.includes('Oversized')
      ? 'Relaxed, boxy fit — size down for a classic cut.'
      : 'True to size, regular fit.',
    printMethod: 'Water-based screen print, cured for durability.',
    care: 'Machine wash cold, inside out. Do not tumble dry.',
    deliveryEstimate: '3–6 working days within Nigeria.',
    returnSummary: '14-day returns on unworn items.',
    colours: seed.colours.map((name) => ({
      name,
      hex: COLOUR_PALETTE[name] ?? '#888888',
      available: !seed.unavailableColours?.includes(name),
    })),
    sizes: SIZES.map((label) => ({
      label,
      available: seed.availability !== 'sold_out' && !seed.soldOutSizes?.includes(label),
    })),
  };
}

/** Collection metadata keyed by the collection name used on artworks. */
const collectionMeta: { slug: string; name: string; description: string }[] = [
  {
    slug: 'night-studies',
    name: 'Night Studies',
    description: 'Ink and neon drawn after dark, when the city is at its most honest.',
  },
  {
    slug: 'comic-line',
    name: 'Comic Line',
    description: 'Comic-panel storytelling, told one bold, uninterrupted line at a time.',
  },
  {
    slug: 'season-sketches',
    name: 'Season Sketches',
    description: 'Quiet studies that follow the turning of the seasons.',
  },
  {
    slug: 'city-portraits',
    name: 'City Portraits',
    description: 'Street-level scenes rendered in confident, tangled linework.',
  },
];

const artworks: ArtworkSummary[] = [
  {
    id: 'a1',
    slug: 'midnight-in-lagos',
    title: 'Midnight in Lagos',
    collection: 'Night Studies',
    shortStory: 'Ink and neon from a restless city that never fully sleeps.',
    availability: 'available',
    startingPriceMinor: 1200000,
    currency: 'NGN',
    compatibleGarments: ['Classic T-shirt', 'Oversized T-shirt'],
    limitedEdition: false,
  },
  {
    id: 'a2',
    slug: 'paper-tigers',
    title: 'Paper Tigers',
    collection: 'Comic Line',
    shortStory: 'A comic-panel study of courage that is mostly bluff.',
    availability: 'limited',
    startingPriceMinor: 1500000,
    currency: 'NGN',
    compatibleGarments: ['Oversized T-shirt', 'Long-sleeve shirt'],
    limitedEdition: true,
  },
  {
    id: 'a3',
    slug: 'harmattan-bloom',
    title: 'Harmattan Bloom',
    collection: 'Season Sketches',
    shortStory: 'Dust-season florals drawn in a single unbroken line.',
    availability: 'available',
    startingPriceMinor: 1100000,
    currency: 'NGN',
    compatibleGarments: ['Classic T-shirt'],
    limitedEdition: false,
  },
  {
    id: 'a4',
    slug: 'lantern-keeper',
    title: 'Lantern Keeper',
    collection: 'Night Studies',
    shortStory: 'A quiet figure holding the only warm light on the street.',
    availability: 'available',
    startingPriceMinor: 1300000,
    currency: 'NGN',
    compatibleGarments: ['Classic T-shirt', 'Long-sleeve shirt'],
    limitedEdition: false,
  },
  {
    id: 'a5',
    slug: 'the-getaway',
    title: 'The Getaway',
    collection: 'Comic Line',
    shortStory: 'Three panels, one bad decision, and a very fast bicycle.',
    availability: 'sold_out',
    startingPriceMinor: 1600000,
    currency: 'NGN',
    compatibleGarments: ['Oversized T-shirt'],
    limitedEdition: true,
  },
  {
    id: 'a6',
    slug: 'rainy-season',
    title: 'Rainy Season',
    collection: 'Season Sketches',
    shortStory: 'Umbrellas as punctuation across a grey afternoon.',
    availability: 'available',
    startingPriceMinor: 1150000,
    currency: 'NGN',
    compatibleGarments: ['Classic T-shirt', 'Oversized T-shirt'],
    limitedEdition: false,
  },
  {
    id: 'a7',
    slug: 'market-day',
    title: 'Market Day',
    collection: 'City Portraits',
    shortStory: 'A crowded stall rendered in confident, tangled linework.',
    availability: 'limited',
    startingPriceMinor: 1400000,
    currency: 'NGN',
    compatibleGarments: ['Classic T-shirt', 'Oversized T-shirt', 'Long-sleeve shirt'],
    limitedEdition: true,
  },
  {
    id: 'a8',
    slug: 'okada-run',
    title: 'Okada Run',
    collection: 'City Portraits',
    shortStory: 'Motion blur on two wheels, told entirely in ink.',
    availability: 'available',
    startingPriceMinor: 1250000,
    currency: 'NGN',
    compatibleGarments: ['Oversized T-shirt'],
    limitedEdition: false,
  },
];

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/**
 * Drop seeds (TMS-F5-001). Timings are offsets in ms relative to "now" so the
 * preview always shows a live countdown for each state; the real API
 * (TMS-FBR-008) will send absolute server timestamps. `earlyOffset`/`endOffset`
 * are null when there is no early window / the drop is open-ended.
 */
interface DropSeed {
  slug: string;
  title: string;
  tagline: string;
  story: string;
  collection: string;
  earlyOffset: number | null;
  releaseOffset: number;
  endOffset: number | null;
  soldOut: boolean;
}

const dropSeeds: DropSeed[] = [
  {
    slug: 'night-market',
    title: 'Night Market',
    tagline: 'The Night Studies drop, live now.',
    story:
      'Four pieces pulled from the quietest hours of the city — ink, neon and the last warm light on the street. Made to order in a limited run.',
    collection: 'Night Studies',
    earlyOffset: -2 * DAY_MS,
    releaseOffset: -1 * DAY_MS,
    endOffset: 3 * DAY_MS,
    soldOut: false,
  },
  {
    slug: 'city-portraits-vol-1',
    title: 'City Portraits, Vol. 1',
    tagline: 'Early access is open for members.',
    story:
      'Street-level scenes rendered in confident, tangled linework. Members get first access before the public release.',
    collection: 'City Portraits',
    earlyOffset: -1 * HOUR_MS,
    releaseOffset: 1 * DAY_MS,
    endOffset: 8 * DAY_MS,
    soldOut: false,
  },
  {
    slug: 'harmattan-editions',
    title: 'Harmattan Editions',
    tagline: 'Dust-season florals, dropping soon.',
    story:
      'A short seasonal set drawn in single unbroken lines. Join early access to be first in the queue when it opens.',
    collection: 'Season Sketches',
    earlyOffset: 1 * DAY_MS,
    releaseOffset: 2 * DAY_MS,
    endOffset: 9 * DAY_MS,
    soldOut: false,
  },
  {
    slug: 'comic-line-reprint',
    title: 'Comic Line — Reprint',
    tagline: 'Sold out in record time.',
    story:
      'A one-week reprint of the Comic Line favourites. This run has fully sold through — join the waitlist for the next one.',
    collection: 'Comic Line',
    earlyOffset: -6 * DAY_MS,
    releaseOffset: -5 * DAY_MS,
    endOffset: 2 * DAY_MS,
    soldOut: true,
  },
  {
    slug: 'first-light',
    title: 'First Light',
    tagline: 'The drop that started it all — now closed.',
    story:
      'The studio’s first limited release, archived here for the record. Closed to new orders.',
    collection: 'Night Studies',
    earlyOffset: -12 * DAY_MS,
    releaseOffset: -11 * DAY_MS,
    endOffset: -2 * DAY_MS,
    soldOut: false,
  },
];

function dropArtworks(collection: string): ArtworkSummary[] {
  return artworks.filter((a) => a.collection === collection);
}

function toDropSummary(seed: DropSeed, now: number): DropSummary {
  const iso = (offset: number | null): string | null =>
    offset === null ? null : new Date(now + offset).toISOString();
  return {
    slug: seed.slug,
    title: seed.title,
    tagline: seed.tagline,
    collection: seed.collection,
    earlyAccessAt: iso(seed.earlyOffset),
    releaseAt: iso(seed.releaseOffset)!,
    endsAt: iso(seed.endOffset),
    pieceCount: dropArtworks(seed.collection).length,
    soldOut: seed.soldOut,
  };
}

function delay<T>(value: T): Promise<T> {
  return Promise.resolve(value);
}

/** Deterministic in-memory provider. Types match the real contract for a clean swap. */
export const mockProvider: StorefrontDataProvider = {
  async listArtworks(params: ListArtworksParams = {}): Promise<CursorPage<ArtworkSummary>> {
    let items = [...artworks];
    if (params.collection) {
      items = items.filter((a) => a.collection === params.collection);
    }
    if (params.availability) {
      items = items.filter((a) => a.availability === params.availability);
    }
    // "newest" keeps insertion order; "popular" is a stable deterministic reordering.
    if (params.sort === 'popular') {
      items = items.slice().reverse();
    }
    const limit = params.limit ?? 20;
    return delay({ items: items.slice(0, limit), nextCursor: null });
  },

  async getArtwork(slug: string): Promise<ArtworkDetail | null> {
    const summary = artworks.find((a) => a.slug === slug);
    if (!summary) return delay(null);
    return delay({
      ...summary,
      story: `${summary.shortStory} The full piece explores line, restraint, and contrast.`,
      inspiration: 'Street photography, comic inking, and West African textiles.',
      edition: summary.limitedEdition ? 'Limited edition of 100' : 'Open edition',
      release: '2026',
      related: artworks.filter((a) => a.id !== summary.id).slice(0, 3),
    });
  },

  async listCollections(): Promise<string[]> {
    return delay([...new Set(artworks.map((a) => a.collection))].sort());
  },

  async searchArtworks(query: string, limit = 24): Promise<ArtworkSummary[]> {
    return delay(artworks.filter((a) => artworkMatchesQuery(a, query)).slice(0, limit));
  },

  async listCollectionSummaries(): Promise<CollectionSummary[]> {
    return delay(
      collectionMeta.map((c) => ({
        ...c,
        artworkCount: artworks.filter((a) => a.collection === c.name).length,
      })),
    );
  },

  async getCollection(slug: string): Promise<CollectionDetail | null> {
    const meta = collectionMeta.find((c) => c.slug === slug);
    if (!meta) return delay(null);
    const members = artworks.filter((a) => a.collection === meta.name);
    return delay({ ...meta, artworkCount: members.length, artworks: members });
  },

  async listProducts(): Promise<ProductSummary[]> {
    return delay(productSeeds.map(toProductSummary));
  },

  async getProduct(slug: string): Promise<ProductDetail | null> {
    const seed = productSeeds.find((p) => p.slug === slug);
    return delay(seed ? toProductDetail(seed) : null);
  },

  async getStudioOptions(): Promise<StudioOptions> {
    return delay({
      colours: Object.entries(COLOUR_PALETTE).map(([name, hex]) => ({
        name,
        hex,
        available: true,
      })),
      sizes: SIZES,
      placements: [
        { id: 'left-chest', label: 'Left chest', area: 'front', x: 33, y: 30 },
        { id: 'centre-chest', label: 'Centre chest', area: 'front', x: 50, y: 38 },
        { id: 'full-front', label: 'Full front', area: 'front', x: 50, y: 52 },
        { id: 'back', label: 'Back', area: 'back', x: 50, y: 42 },
      ],
      scalePresets: [
        { id: 'small', label: 'Small', widthPct: 20 },
        { id: 'medium', label: 'Medium', widthPct: 44 },
        { id: 'large', label: 'Large', widthPct: 64 },
      ],
    });
  },

  async getDeliveryOptions(): Promise<DeliveryOption[]> {
    return delay([
      {
        id: 'standard',
        label: 'Standard delivery',
        description: 'Tracked courier across Nigeria.',
        priceMinor: 250000,
        currency: 'NGN',
        eta: '3–6 working days',
      },
      {
        id: 'express',
        label: 'Express delivery',
        description: 'Priority dispatch to major cities.',
        priceMinor: 500000,
        currency: 'NGN',
        eta: '1–2 working days',
      },
      {
        id: 'pickup',
        label: 'Studio pickup — Lagos',
        description: 'Collect from the studio in Lagos. We email when it is ready.',
        priceMinor: 0,
        currency: 'NGN',
        eta: 'Ready in 2–4 working days',
      },
    ]);
  },

  async listDrops(): Promise<DropSummary[]> {
    const now = Date.now();
    return delay(dropSeeds.map((seed) => toDropSummary(seed, now)));
  },

  async getDrop(slug: string): Promise<DropDetail | null> {
    const seed = dropSeeds.find((d) => d.slug === slug);
    if (!seed) return delay(null);
    return delay({
      ...toDropSummary(seed, Date.now()),
      story: seed.story,
      artworks: dropArtworks(seed.collection),
    });
  },
};
