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

  it('keeps clothing photographs in Shop and links them to artwork', () => {
    expect(suppliedShopDesigns).toHaveLength(4);

    const artworkSlugs = new Set(suppliedArtworkSeeds.map(({ slug }) => slug));
    for (const design of suppliedShopDesigns) {
      expect(design.image).toMatch(/^\/products\/.+\.jpg$/);
      expect(artworkSlugs.has(design.artworkSlug)).toBe(true);
      expect(existsSync(join(process.cwd(), 'public', design.image.slice(1)))).toBe(true);
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
