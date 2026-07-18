import { cn } from '@tms/ui';
import { ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { StorySummary } from '@/lib/data';

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(iso),
  );

/**
 * A story tile for the journal index. Each story leads with a drawing from the gallery, so the tile
 * carries that piece as its cover with an editorial type treatment over it: category, a big
 * uppercase title, and the shoppable/read meta. A story whose art has no plate yet falls back to the
 * dark type-only tile (docs/frontend/UI_DIRECTION.md §7) rather than a grey placeholder.
 */
export function StoryCard({ story }: { story: StorySummary }) {
  const cover = story.coverImage ?? null;

  return (
    <Link
      href={`/stories/${story.slug}`}
      className="group block rounded-2xl outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-focus-ring)]"
    >
      <div
        className={cn(
          'relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-2xl p-6 text-white',
          cover ? 'bg-neutral-900' : 'bg-neutral-950 transition-colors group-hover:bg-neutral-800',
        )}
      >
        {cover ? (
          <>
            <Image
              src={cover}
              alt=""
              aria-hidden
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-[var(--duration-slow)] ease-[var(--ease-emphasis)] group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
            {/* Legibility wash — dark at top and bottom for the category and title, lighter through
                the middle so the drawing reads. */}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/70"
            />
          </>
        ) : null}

        <div className="relative flex items-start justify-between gap-3">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            {story.category}
          </p>
          {story.shoppableCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[0.7rem] font-medium text-white backdrop-blur-sm">
              <ShoppingBag className="size-3.5" aria-hidden />
              {story.shoppableCount}
            </span>
          ) : null}
        </div>
        <h3 className="relative font-display text-2xl font-bold uppercase leading-[0.98] tracking-tight drop-shadow-sm sm:text-3xl">
          {story.title}
        </h3>
        <p className="relative text-xs uppercase tracking-[0.14em] text-white/70">
          {fmtDate(story.publishedOn)} · {story.readMinutes} min read
        </p>
      </div>
      <p className="mt-3 text-sm text-muted">{story.excerpt}</p>
    </Link>
  );
}
