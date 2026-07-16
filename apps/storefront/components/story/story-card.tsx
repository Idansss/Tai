import { Eyebrow, Frame, Heading, Text } from '@tms/ui';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { ArtworkVisual } from '@/components/artwork/artwork-visual';
import type { StorySummary } from '@/lib/data';

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(iso),
  );

/** A story tile for the journal index. */
export function StoryCard({ story }: { story: StorySummary }) {
  return (
    <Link
      href={`/stories/${story.slug}`}
      className="group block rounded-[var(--radius-lg)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
    >
      <Frame ratio="collection" mat="canvas" interactive>
        <ArtworkVisual seed={`story-${story.slug}`} title={story.title} label={story.category} />
        {story.shoppableCount > 0 ? (
          <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-surface/95 px-2.5 py-1 font-mono text-[0.7rem] uppercase tracking-[0.08em] text-ink shadow-sm">
            <ShoppingBag className="size-3.5 text-accent-2" aria-hidden />
            {story.shoppableCount} shoppable
          </span>
        ) : null}
      </Frame>
      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Eyebrow>{story.category}</Eyebrow>
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-muted">
            {story.readMinutes} min
          </span>
        </div>
        <Heading as={3} size="md" className="transition-colors group-hover:text-accent-2">
          {story.title}
        </Heading>
        <Text size="sm" tone="muted" className="line-clamp-2">
          {story.excerpt}
        </Text>
        <div className="flex items-center justify-between pt-1">
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-muted">
            {fmtDate(story.publishedOn)}
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-[0.1em] text-ink transition-all group-hover:gap-2 group-hover:text-accent-2">
            Read <ArrowRight className="size-3.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
