import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Server-side resolver: does a real bitmap exist for this artwork?
 *
 * Artwork files live in `public/artworks/<slug>.<ext>`. Because this runs on the
 * server (in the server components that render cards/heroes), we can check the
 * filesystem directly and only hand the client an <img> src when the file is
 * actually there — so missing pieces show the drawn placeholder plate instantly,
 * with no broken-image flash and no wasted 404 requests.
 *
 * To add a piece: drop `public/artworks/<slug>.jpg` (or .png/.webp). Nothing else
 * to wire — it appears wherever that artwork is shown.
 */
const ARTWORKS_DIR = join(process.cwd(), 'public', 'artworks');
const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;

export function resolveArtworkImage(slug: string): string | null {
  for (const ext of EXTENSIONS) {
    const file = `${slug}.${ext}`;
    if (existsSync(join(ARTWORKS_DIR, file))) {
      return `/artworks/${file}`;
    }
  }
  return null;
}
