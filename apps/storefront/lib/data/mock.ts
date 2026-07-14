import type { CursorPage } from '@tms/contracts';
import { artworkMatchesQuery } from '../search';
import type {
  ArtworkDetail,
  ArtworkSummary,
  CollectionDetail,
  CollectionSummary,
  ListArtworksParams,
  StorefrontDataProvider,
} from './types';

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
};
