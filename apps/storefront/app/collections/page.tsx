import { Container, EmptyState } from '@tms/ui';
import type { Metadata } from 'next';
import { CollectionCard } from '@/components/collection/collection-card';
import { PageHeader } from '@/components/site/page-header';
import { artworkImage } from '@/lib/artwork-images';
import { dataProvider } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Collections',
  description: 'Curated bodies of work, grouped by theme and season.',
};

export default async function CollectionsPage() {
  const summaries = await dataProvider.listCollectionSummaries();

  // Collection summaries carry no cover image, so pull each collection's pieces and pick the first
  // one we actually hold a drawing for as the chapter cover. A handful of collections; cheap.
  const details = await Promise.all(summaries.map((s) => dataProvider.getCollection(s.slug)));
  const collections = summaries.map((summary, i) => ({
    summary,
    coverSlug: details[i]?.artworks.find((a) => artworkImage(a.slug) !== null)?.slug ?? null,
  }));

  return (
    <Container className="py-14">
      <PageHeader
        eyebrow="The gallery"
        title="Collections"
        lead="Curated bodies of work, grouped by theme and season — each a chapter in the studio's line."
        contained={false}
      />

      {collections.length === 0 ? (
        <div className="mt-10">
          <EmptyState title="No collections yet" description="New collections are on their way." />
        </div>
      ) : (
        <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map(({ summary, coverSlug }) => (
            <li key={summary.slug}>
              <CollectionCard collection={summary} coverSlug={coverSlug} />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
