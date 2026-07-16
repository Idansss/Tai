import { Card, Eyebrow, Heading, Text } from '@tms/ui';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { CollectionSummary } from '@/lib/data';

export function CollectionCard({ collection }: { collection: CollectionSummary }) {
  return (
    <Link
      href={`/collections/${collection.slug}`}
      className="group block rounded-[var(--radius-lg)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
    >
      <Card variant="surface" interactive padded={false} className="overflow-hidden">
        <div
          className="aspect-[16/9] w-full bg-gradient-to-br from-canvas-2 to-surface-2"
          role="img"
          aria-label={`${collection.name}, collection cover placeholder`}
        />
        <div className="space-y-2 p-5">
          <Eyebrow>
            {collection.artworkCount} {collection.artworkCount === 1 ? 'piece' : 'pieces'}
          </Eyebrow>
          <Heading as={3} size="md">
            {collection.name}
          </Heading>
          <Text size="sm" tone="muted">
            {collection.description}
          </Text>
          <span className="inline-flex items-center gap-1 pt-1 text-sm text-accent group-hover:gap-2">
            View collection <ArrowRight className="size-4" aria-hidden />
          </span>
        </div>
      </Card>
    </Link>
  );
}
