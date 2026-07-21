import { describe, expect, it } from 'vitest';
import type { ArtworkSummary } from './data/types';
import {
  defaultOpenStudioFolderId,
  groupArtworksForStudio,
  STUDIO_ARTWORK_FOLDERS,
} from './studio-artwork-folders';

function art(partial: Pick<ArtworkSummary, 'slug' | 'title' | 'collection'>): ArtworkSummary {
  return {
    id: partial.slug,
    slug: partial.slug,
    title: partial.title,
    collection: partial.collection,
    shortStory: '',
    availability: 'available',
    startingPriceMinor: 100,
    currency: 'NGN',
    compatibleGarments: ['Classic T-shirt'],
    limitedEdition: false,
  };
}

describe('groupArtworksForStudio', () => {
  it('puts every collection piece into one of the two folders', () => {
    const items = [
      art({ slug: 'midnight-in-lagos', title: 'Midnight in Lagos', collection: 'Night Studies' }),
      art({ slug: 'paper-tigers', title: 'Paper Tigers', collection: 'Comic Line' }),
      art({
        slug: 'africa-united-heritage-duo',
        title: 'Africa United Heritage Duo',
        collection: 'Africa United',
      }),
      art({ slug: 'resilience-hands-high', title: 'Resilience Hands High', collection: 'Resilience' }),
      art({ slug: 'studio-cap-muse', title: 'Studio Cap Muse', collection: 'Studio Muses' }),
    ];

    const groups = groupArtworksForStudio(items);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.folder.id)).toEqual(['signature', 'studio-collections']);
    expect(groups[0]!.artworks.map((a) => a.slug)).toEqual([
      'midnight-in-lagos',
      'paper-tigers',
    ]);
    expect(groups[1]!.artworks.map((a) => a.slug)).toEqual([
      'africa-united-heritage-duo',
      'resilience-hands-high',
      'studio-cap-muse',
    ]);
    expect(groups.flatMap((g) => g.artworks)).toHaveLength(items.length);
  });

  it('drops empty folders', () => {
    const groups = groupArtworksForStudio([
      art({ slug: 'market-day', title: 'Market Day', collection: 'City Portraits' }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.folder.id).toBe('signature');
  });

  it('opens the folder that contains the selected artwork', () => {
    const groups = groupArtworksForStudio([
      art({ slug: 'paper-tigers', title: 'Paper Tigers', collection: 'Comic Line' }),
      art({ slug: 'city-sisters', title: 'City Sisters', collection: 'Africa United' }),
    ]);
    expect(defaultOpenStudioFolderId(groups, 'city-sisters')).toBe('studio-collections');
    expect(defaultOpenStudioFolderId(groups, null)).toBe(STUDIO_ARTWORK_FOLDERS[0]!.id);
  });
});
