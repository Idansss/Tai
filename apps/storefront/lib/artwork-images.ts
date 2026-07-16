import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Server-side media resolver. Image files live under `public/<dir>/<name>.<ext>`
 * (dir = artworks | products | drops). Because this runs on the server we can
 * check the filesystem directly and only hand the client an <img> src when the
 * file exists — so missing pieces show the drawn placeholder plate instantly,
 * with no broken-image flash and no wasted 404s.
 *
 * To add a piece: drop the file in the right folder. Nothing else to wire.
 */
const PUBLIC_DIR = join(process.cwd(), 'public');
const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;

function resolveIn(dir: string, name: string): string | null {
  if (!name) return null;
  for (const ext of EXTENSIONS) {
    const file = `${name}.${ext}`;
    if (existsSync(join(PUBLIC_DIR, dir, file))) {
      return `/${dir}/${file}`;
    }
  }
  return null;
}

/** The artwork illustration for a slug (public/artworks/<slug>). */
export function resolveArtworkImage(slug: string): string | null {
  return resolveIn('artworks', slug);
}

/**
 * The image for a product card. A real garment photo (public/products/<slug>)
 * wins; otherwise we fall back to the artwork printed on it.
 */
export function resolveProductImage(productSlug: string, artworkSlug: string): string | null {
  return resolveIn('products', productSlug) ?? resolveIn('artworks', artworkSlug);
}

/** Representative artwork per collection, used for collection/drop covers. */
const COLLECTION_ARTWORK: Record<string, string> = {
  'Night Studies': 'midnight-in-lagos',
  'Comic Line': 'paper-tigers',
  'Season Sketches': 'harmattan-bloom',
  'City Portraits': 'market-day',
};

/**
 * The image for a drop card. A dedicated drop cover (public/drops/<slug>) wins;
 * otherwise a representative piece from the drop's collection, then a group
 * heritage image.
 */
export function resolveDropImage(dropSlug: string, collection: string): string | null {
  return (
    resolveIn('drops', dropSlug) ??
    resolveArtworkImage(COLLECTION_ARTWORK[collection] ?? '') ??
    resolveArtworkImage('flags-trio')
  );
}
