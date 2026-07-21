import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { artworkImage } from '../artwork-images';
import { primaryNav } from '../nav';
import { mockProvider } from './mock';
import { suppliedArtworkSeeds, suppliedShopDesigns } from './supplied-catalogue';

describe('studio-supplied catalogue media', () => {
  it('keeps every standalone artwork in Collections', async () => {
    expect(suppliedArtworkSeeds).toHaveLength(34);

    const { items } = await mockProvider.listArtworks({ limit: 100 });
    const catalogueSlugs = new Set(items.map(({ slug }) => slug));

    for (const artwork of suppliedArtworkSeeds) {
      expect(catalogueSlugs.has(artwork.slug)).toBe(true);
      expect(artworkImage(artwork.slug)).toBe(`/artworks/${artwork.slug}.jpg`);
      expect(existsSync(join(process.cwd(), 'public', 'artworks', `${artwork.slug}.jpg`))).toBe(
        true,
      );
    }
  });

  it('keeps clothing photographs in Shop as buyable products', async () => {
    expect(suppliedShopDesigns).toHaveLength(4);

    const products = await mockProvider.listProducts();
    const bySlug = new Map(products.map((p) => [p.slug, p]));
    const artworkSlugs = new Set(suppliedArtworkSeeds.map(({ slug }) => slug));

    for (const design of suppliedShopDesigns) {
      expect(design.image).toMatch(/^\/products\/.+\.jpg$/);
      expect(artworkSlugs.has(design.artworkSlug)).toBe(true);
      expect(existsSync(join(process.cwd(), 'public', design.image.slice(1)))).toBe(true);

      const product = bySlug.get(design.slug);
      expect(product).toBeDefined();
      expect(product?.image).toBe(design.image);
      expect(product?.artworkSlug).toBe(design.artworkSlug);
      expect(product?.availability).toBe('available');

      const detail = await mockProvider.getProduct(design.slug);
      expect(detail).not.toBeNull();
      expect(detail?.colours.length).toBe(1);
      expect(detail?.colours.every((c) => c.available)).toBe(true);
      expect(detail?.sizes.some((s) => s.available)).toBe(true);
      // Front photo is supplied; back may be a photo later, otherwise the product page
      // falls back to the garment mockup so Front/Back is always available.
      expect(detail?.image).toBe(design.image);
      expect(detail?.imageBack ?? null).toBe(design.imageBack ?? null);
    }
  });

  it('uses Collections and Shop as the two clear catalogue destinations', () => {
    expect(primaryNav).toEqual(
      expect.arrayContaining([
        { href: '/collections', label: 'Collections' },
        { href: '/shop', label: 'Shop' },
      ]),
    );
    expect(primaryNav.some(({ label }) => label === 'Artworks')).toBe(false);
  });
});
