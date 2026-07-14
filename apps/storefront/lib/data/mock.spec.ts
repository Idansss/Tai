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

describe('mockProvider products', () => {
  it('lists products with colour counts and a garment', async () => {
    const products = await mockProvider.listProducts();
    expect(products.length).toBeGreaterThan(0);
    for (const p of products) {
      expect(p.colourCount).toBeGreaterThan(0);
      expect(p.garment).toBeTruthy();
      expect(p.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('returns product detail with colours, sizes and care info', async () => {
    const product = await mockProvider.getProduct('midnight-in-lagos-classic-tee');
    expect(product).not.toBeNull();
    expect(product?.colours.length).toBe(product?.colourCount);
    expect(product?.sizes.length).toBeGreaterThan(0);
    expect(product?.sizes.some((s) => !s.available)).toBe(true); // XS sold out
    expect(product?.care).toBeTruthy();
  });

  it('returns null for an unknown product slug', async () => {
    expect(await mockProvider.getProduct('nope')).toBeNull();
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
