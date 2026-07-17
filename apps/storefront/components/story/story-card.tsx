import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import type { StorySummary } from '@/lib/data';

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(iso),
  );

/**
 * A story tile for the journal index. Stories carry no cover drawing, so this is a bold dark
 * editorial tile (docs/frontend/UI_DIRECTION.md §7): category, a big uppercase title, and the
 * shoppable/read meta — a confident chapter cover made of type, not a grey placeholder.
 */
export function StoryCard({ story }: { story: StorySummary }) {
  return (
    <Link
      href={`/stories/${story.slug}`}
      className="group block rounded-2xl outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-focus-ring)]"
    >
      <div className="relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-2xl bg-neutral-950 p-6 text-white transition-colors group-hover:bg-neutral-800">
        <div className="flex items-start justify-between gap-3">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            {story.category}
          </p>
          {story.shoppableCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[0.7rem] font-medium text-white">
              <ShoppingBag className="size-3.5" aria-hidden />
              {story.shoppableCount}
            </span>
          ) : null}
        </div>
        <h3 className="font-display text-2xl font-bold uppercase leading-[0.98] tracking-tight sm:text-3xl">
          {story.title}
        </h3>
        <p className="text-xs uppercase tracking-[0.14em] text-white/50">
          {fmtDate(story.publishedOn)} · {story.readMinutes} min read
        </p>
      </div>
      <p className="mt-3 text-sm text-muted">{story.excerpt}</p>
    </Link>
  );
}
