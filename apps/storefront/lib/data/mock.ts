import type { CursorPage } from '@tms/contracts';
import type {
  ArtworkDetail,
  ArtworkSummary,
  ListArtworksParams,
  StorefrontDataProvider,
} from './types';

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
      related: artworks.filter((a) => a.id !== summary.id).slice(0, 2),
    });
  },
};
