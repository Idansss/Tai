import { cn } from '@tms/ui';
import Image from 'next/image';
import { artworkImage, artworkSketch } from '@/lib/artwork-images';

/**
 * A plate: one drawing, matted on paper, with a caption that never covers it.
 *
 * This is the component the whole direction rests on (docs/frontend/UI_DIRECTION.md), so it
 * encodes the rules rather than leaving them to each caller:
 *
 * 1. **Nothing covers the artwork.** No scrim, no overlay text, no gradient. The caption lives
 *    below the mat in its own space. This is the Zeitz MOCAA mistake and it is not repeatable
 *    here — there is no prop that would let you do it.
 * 2. **Colour is a reward.** A plate rests in graphite and warms to full colour on attention.
 *    Where the artist has drawn a real sketch we show it; otherwise we remove colour from the
 *    drawing, which is honest — the work underneath is pencil.
 * 3. **The drawing is an object.** It sits on a mat with paper around it. We never crop a piece
 *    to fit a grid; the mat adapts to the drawing.
 */
export interface PlateProps {
  slug: string;
  title: string;
  /** Where the piece is from — the caption's second line. Usually the collection or city. */
  city?: string;
  /** e.g. "Coloured pencil on paper". Museum caption discipline: small, set, unsold. */
  medium?: string;
  /** Above-the-fold plates should not lazy-load. */
  priority?: boolean;
  /** Rest in colour instead of graphite. For a detail page, where the piece is the subject. */
  alwaysColour?: boolean;
  className?: string;
  sizes?: string;
}

export function Plate({
  slug,
  title,
  city,
  medium,
  priority = false,
  alwaysColour = false,
  className,
  sizes = '(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw',
}: PlateProps) {
  const src = artworkImage(slug);
  const sketch = artworkSketch(slug);
  const captionAlt = `${title}${city ? `, ${city}` : ''} — artwork`;

  // No drawing, no plate. An empty frame is worse than nothing: it promises work we do not have.
  if (!src) return null;

  return (
    <figure className={cn('group/plate', className)}>
      {/* The mat. Paper around the drawing, a hairline of paper edge, no radius theatre. */}
      <div className="relative overflow-hidden rounded-[var(--radius-sm)] border border-line bg-surface p-2 sm:p-3">
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-canvas-2">
          {sketch ? (
            <>
              {/* A real sketch and the finished piece are two different drawings, so they
                  cross-fade. This is the true signature: the artist's own graphite warming into
                  their own colour. */}
              <Image
                src={sketch}
                alt=""
                aria-hidden
                fill
                sizes={sizes}
                priority={priority}
                className={cn(
                  'object-cover transition-opacity duration-[var(--duration-slow)] ease-[var(--ease-emphasis)] motion-reduce:transition-none',
                  alwaysColour
                    ? 'opacity-0'
                    : 'opacity-100 group-hover/plate:opacity-0 group-focus-within/plate:opacity-0 motion-reduce:opacity-0',
                )}
              />
              <Image
                src={src}
                alt={captionAlt}
                fill
                sizes={sizes}
                priority={priority}
                className={cn(
                  'object-cover transition-opacity duration-[var(--duration-slow)] ease-[var(--ease-emphasis)] motion-reduce:transition-none',
                  alwaysColour
                    ? 'opacity-100'
                    : 'opacity-0 group-hover/plate:opacity-100 group-focus-within/plate:opacity-100 motion-reduce:opacity-100',
                )}
              />
            </>
          ) : (
            /*
             * No sketch exists for this piece, so there is only one drawing. Removing its colour
             * reveals the pencil that is genuinely underneath — honest, and one image instead of
             * two: cross-fading a bitmap against a copy of itself would decode it twice to show
             * the same picture. Reduced motion is not a lesser experience: the colour is already
             * there.
             */
            <Image
              src={src}
              alt={captionAlt}
              fill
              sizes={sizes}
              priority={priority}
              className={cn(
                'object-cover transition-[filter] duration-[var(--duration-slow)] ease-[var(--ease-emphasis)] motion-reduce:transition-none',
                alwaysColour
                  ? 'grayscale-0'
                  : 'grayscale contrast-[1.08] brightness-[1.03] group-hover/plate:grayscale-0 group-hover/plate:contrast-100 group-hover/plate:brightness-100 group-focus-within/plate:grayscale-0 group-focus-within/plate:contrast-100 group-focus-within/plate:brightness-100 motion-reduce:grayscale-0 motion-reduce:contrast-100 motion-reduce:brightness-100',
              )}
            />
          )}
        </div>
      </div>

      {/* The caption. Below the mat, in its own space, never over the drawing. */}
      <figcaption className="mt-3 flex items-baseline justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate text-sm text-ink">{title}</span>
          {city ? <span className="block truncate text-xs text-muted">{city}</span> : null}
        </span>
        {medium ? (
          <span className="shrink-0 text-[11px] uppercase tracking-[0.08em] text-muted">
            {medium}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
