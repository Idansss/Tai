/**
 * Where an artwork's image lives.
 *
 * The drawings are files in `public/artworks`, named by slug. This is deliberately a plain
 * lookup rather than a fetch: the media pipeline (TMS-B2-004) will own real derivatives later,
 * and when it does this module is the single place that changes.
 */

/** Slugs we hold a drawing for. Anything else has no plate to show. */
const ARTWORK_SLUGS = new Set([
  'harmattan-bloom',
  'lantern-keeper',
  'market-day',
  'midnight-in-lagos',
  'okada-run',
  'paper-tigers',
  'rainy-season',
  'the-getaway',
]);

/**
 * Slugs that also exist as a true graphite sketch.
 *
 * Empty today: the three sketch files we hold (addis-coffee-garden, nigeria-muse-sketch,
 * nile-muse-sketch) are separate pieces, not the sketch states of the eight in the gallery. Until
 * the artist supplies real pairs, the Plate derives its graphite state by removing colour — which
 * is honest, because the drawing underneath is pencil. Add a slug here the moment a real sketch
 * lands and the Plate will prefer it automatically.
 */
const SKETCH_SLUGS = new Set<string>([]);

export function artworkImage(slug: string): string | null {
  return ARTWORK_SLUGS.has(slug) ? `/artworks/${slug}.jpg` : null;
}

/** The artist's own sketch of a piece, when one exists. */
export function artworkSketch(slug: string): string | null {
  return SKETCH_SLUGS.has(slug) ? `/artworks/${slug}-sketch.jpg` : null;
}
