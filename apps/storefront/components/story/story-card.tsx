import { Card, Eyebrow, Heading, Text } from '@tms/ui';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
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
      <Card variant="surface" interactive padded={false} className="overflow-hidden">
        <div
          className="relative aspect-[16/9] w-full bg-gradient-to-br from-canvas-2 to-surface-2"
          role="img"
          aria-label={`${story.title} — story cover placeholder`}
        >
          {story.shoppableCount > 0 ? (
            <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-medium text-ink">
              <ShoppingBag className="size-3.5 text-accent" aria-hidden />
              {story.shoppableCount} shoppable
            </span>
          ) : null}
        </div>
        <div className="space-y-2 p-5">
          <div className="flex items-center justify-between gap-2">
            <Eyebrow>{story.category}</Eyebrow>
            <Text size="sm" tone="muted">
              {story.readMinutes} min read
            </Text>
          </div>
          <Heading as={3} size="md">
            {story.title}
          </Heading>
          <Text size="sm" tone="muted">
            {story.excerpt}
          </Text>
          <div className="flex items-center justify-between pt-2">
            <Text size="sm" tone="muted">
              {fmtDate(story.publishedOn)}
            </Text>
            <span className="inline-flex items-center gap-1 text-sm text-accent group-hover:gap-2">
              Read story <ArrowRight className="size-4" aria-hidden />
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
