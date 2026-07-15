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

describe('mockProvider studio options', () => {
  it('returns colours, sizes, placements and scale presets', async () => {
    const options = await mockProvider.getStudioOptions();
    expect(options.colours.length).toBeGreaterThan(0);
    expect(options.sizes.length).toBeGreaterThan(0);
    expect(options.placements.some((p) => p.area === 'front')).toBe(true);
    expect(options.placements.some((p) => p.area === 'back')).toBe(true);
    expect(options.scalePresets.every((s) => s.widthPct > 0 && s.widthPct <= 100)).toBe(true);
  });
});

describe('mockProvider delivery options', () => {
  it('returns delivery methods with fees, currency and an ETA', async () => {
    const options = await mockProvider.getDeliveryOptions();
    expect(options.length).toBeGreaterThan(0);
    expect(options.some((o) => o.priceMinor === 0)).toBe(true); // studio pickup is free
    for (const o of options) {
      expect(o.id).toMatch(/^[a-z0-9-]+$/);
      expect(o.priceMinor).toBeGreaterThanOrEqual(0);
      expect(o.currency).toBeTruthy();
      expect(o.eta).toBeTruthy();
    }
  });
});

describe('mockProvider drops', () => {
  it('lists drops with valid timestamps and piece counts', async () => {
    const drops = await mockProvider.listDrops();
    expect(drops.length).toBeGreaterThan(0);
    for (const d of drops) {
      expect(d.slug).toMatch(/^[a-z0-9-]+$/);
      expect(Number.isNaN(Date.parse(d.releaseAt))).toBe(false);
      if (d.earlyAccessAt !== null) expect(Number.isNaN(Date.parse(d.earlyAccessAt))).toBe(false);
      if (d.endsAt !== null) expect(Number.isNaN(Date.parse(d.endsAt))).toBe(false);
      expect(d.pieceCount).toBeGreaterThan(0);
    }
  });

  it('returns a drop with its released artworks', async () => {
    const drop = await mockProvider.getDrop('night-market');
    expect(drop).not.toBeNull();
    expect(drop?.artworks.length).toBe(drop?.pieceCount);
    expect(drop?.artworks.every((a) => a.collection === drop.collection)).toBe(true);
    expect(drop?.story).toBeTruthy();
  });

  it('returns null for an unknown drop slug', async () => {
    expect(await mockProvider.getDrop('does-not-exist')).toBeNull();
  });
});

describe('mockProvider artwork passport', () => {
  it('issues a passport with a stable version id for a limited artwork', async () => {
    const passport = await mockProvider.getArtworkPassport('paper-tigers');
    expect(passport).not.toBeNull();
    expect(passport?.versionId).toMatch(/^AP-[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(passport?.editionSize).toBe(100);
    expect(passport?.serialExample).toMatch(/^No\. \d+ \/ 100$/);
    expect(passport?.provenance.length).toBeGreaterThan(0);
    expect(passport?.issuedBy).toBe('Tai Manic Studios');
  });

  it('marks an open edition with no run size or serial', async () => {
    const passport = await mockProvider.getArtworkPassport('midnight-in-lagos');
    expect(passport?.editionSize).toBeNull();
    expect(passport?.serialExample).toBeNull();
    expect(passport?.edition).toBe('Open edition');
  });

  it('is deterministic — the version id does not change between reads', async () => {
    const a = await mockProvider.getArtworkPassport('market-day');
    const b = await mockProvider.getArtworkPassport('market-day');
    expect(a?.versionId).toBe(b?.versionId);
  });

  it('returns null for an unknown artwork slug', async () => {
    expect(await mockProvider.getArtworkPassport('does-not-exist')).toBeNull();
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
