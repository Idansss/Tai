import { describe, expect, it } from 'vitest';
import { mockProvider } from './mock';

describe('mockProvider collections', () => {
  it('summarises collections with artwork counts that cover the catalogue', async () => {
    const collections = await mockProvider.listCollectionSummaries();
    const { items: all } = await mockProvider.listArtworks({ limit: 100 });
    expect(collections.length).toBeGreaterThan(0);
    const total = collections.reduce((sum, c) => sum + c.artworkCount, 0);
    expect(total).toBe(all.length);
    for (const c of collections) {
      expect(c.slug).toMatch(/^[a-z0-9-]+$/);
      expect(c.artworkCount).toBeGreaterThan(0);
    }
  });

  it('returns a collection with only its own artworks', async () => {
    const collection = await mockProvider.getCollection('night-studies');
    expect(collection).not.toBeNull();
    expect(collection?.name).toBe('Night Studies');
    expect(collection?.artworks.length).toBe(collection?.artworkCount);
    expect(collection?.artworks.every((a) => a.collection === 'Night Studies')).toBe(true);
  });

  it('returns null for an unknown collection slug', async () => {
    expect(await mockProvider.getCollection('does-not-exist')).toBeNull();
  });
});

describe('mockProvider filters & search', () => {
  it('filters artworks by availability', async () => {
    const { items } = await mockProvider.listArtworks({ availability: 'sold_out' });
    expect(items.every((a) => a.availability === 'sold_out')).toBe(true);
  });

  it('searches by term', async () => {
    const results = await mockProvider.searchArtworks('comic');
    expect(results.length).toBeGreaterThan(0);
    expect(await mockProvider.searchArtworks('')).toEqual([]);
  });
});
