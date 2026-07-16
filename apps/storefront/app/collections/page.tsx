import { Container, EmptyState, Reveal } from '@tms/ui';
import type { Metadata } from 'next';
import { CollectionCard } from '@/components/collection/collection-card';
import { PageHeading } from '@/components/site/page-heading';
import { dataProvider } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Collections',
  description: 'Curated bodies of work, grouped by theme and season.',
};

export default async function CollectionsPage() {
  const collections = await dataProvider.listCollectionSummaries();

  return (
    <Container width="wide" className="py-14 sm:py-16">
      <PageHeading
        eyebrow="Gallery"
        index={1}
        title="Collections"
        titleId="collections-title"
        lead="Curated bodies of work, grouped by theme and season."
        meta={`${collections.length} ${collections.length === 1 ? 'collection' : 'collections'}`}
      />

      {collections.length === 0 ? (
        <div className="mt-16">
          <EmptyState title="No collections yet" description="New collections are on their way." />
        </div>
      ) : (
        <ul
          aria-labelledby="collections-title"
          className="mt-12 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
        >
          {collections.map((collection, i) => (
            <Reveal as="li" key={collection.slug} delay={(i % 3) * 70}>
              <CollectionCard collection={collection} />
            </Reveal>
          ))}
        </ul>
      )}
    </Container>
  );
}
